import db from "../../database/models/index.js";
import { Op, Sequelize } from "sequelize";
import vectorSearchService from "./vectorSearch.service.js";
import { getOrSetCache } from "../../core/cache/redis.js";
import translateService from "../translate/translate.service.js";

const isVietnameseText = (text) =>
  Boolean(text && /[àáảãạăằắẳẵặâầấẩẫậđèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵ]/i.test(text));

export const enrichProductsTranslation = async (products, targetLang = "vi") => {
  if (!products || !Array.isArray(products) || products.length === 0) return products;

  const toTranslate = [];
  const toTranslateMap = [];
  const normalizedLang = targetLang?.toLowerCase()?.startsWith("en") ? "en" : "vi";

  products.forEach((p, index) => {
    const rawName = p.name || "";
    if (rawName) {
      if (normalizedLang === "vi") {
        if (!isVietnameseText(rawName)) {
          toTranslate.push(rawName);
          toTranslateMap.push({ index, field: "name" });
        }
      } else if (normalizedLang === "en") {
        if (isVietnameseText(rawName)) {
          toTranslate.push(rawName);
          toTranslateMap.push({ index, field: "name" });
        }
      }
    }

    const catName = p.category?.name;
    if (catName) {
      if (normalizedLang === "vi") {
        if (!isVietnameseText(catName)) {
          toTranslate.push(catName);
          toTranslateMap.push({ index, field: "category" });
        }
      } else if (normalizedLang === "en") {
        if (isVietnameseText(catName)) {
          toTranslate.push(catName);
          toTranslateMap.push({ index, field: "category" });
        }
      }
    }
  });

  if (toTranslate.length > 0) {
    const fromLang = normalizedLang === "vi" ? "auto" : "vi";
    try {
      const translatedList = await translateService.translateTexts(toTranslate, fromLang, normalizedLang);

      toTranslateMap.forEach((item, i) => {
        const translated = translatedList[i];
        if (translated) {
          if (typeof products[item.index].toJSON === "function") {
            products[item.index] = products[item.index].toJSON();
          }
          if (item.field === "name") {
            products[item.index].original_name = products[item.index].name;
            products[item.index].name = translated;
          } else if (item.field === "category" && products[item.index].category) {
            products[item.index].category = {
              ...(typeof products[item.index].category.toJSON === "function"
                ? products[item.index].category.toJSON()
                : products[item.index].category),
              name: translated,
            };
          }
        }
      });
    } catch (e) {
      console.warn("Product translation batch error:", e.message);
    }
  }

  return products;
};

const enrichProductRating = async (product) => {
  if (!product) return null;
  const ratingData = await db.ProductReview.findOne({
    where: { product_id: product.id },
    attributes: [
      [db.sequelize.fn("AVG", db.sequelize.col("rating")), "rating_average"],
      [db.sequelize.fn("COUNT", db.sequelize.col("id")), "review_count"],
    ],
    raw: true,
  });

  const rating_average = ratingData ? parseFloat(ratingData.rating_average || 0) : 0;
  const review_count = ratingData ? parseInt(ratingData.review_count || 0, 10) : 0;

  if (typeof product.toJSON === "function") {
    const productJson = product.toJSON();
    productJson.rating_average = rating_average;
    productJson.review_count = review_count;
    return productJson;
  } else {
    product.rating_average = rating_average;
    product.review_count = review_count;
    return product;
  }
};

const enrichProductsRating = async (products) => {
  if (!products || products.length === 0) return products;

  const productIds = products.map((p) => p.id);
  const ratings = await db.ProductReview.findAll({
    where: { product_id: { [Op.in]: productIds } },
    attributes: [
      "product_id",
      [db.sequelize.fn("AVG", db.sequelize.col("rating")), "rating_average"],
      [db.sequelize.fn("COUNT", db.sequelize.col("id")), "review_count"],
    ],
    group: ["product_id"],
    raw: true,
  });

  const ratingMap = {};
  ratings.forEach((r) => {
    ratingMap[r.product_id] = {
      rating_average: parseFloat(r.rating_average || 0),
      review_count: parseInt(r.review_count || 0, 10),
    };
  });

  return products.map((product) => {
    const r = ratingMap[product.id] || { rating_average: 0, review_count: 0 };
    if (typeof product.toJSON === "function") {
      const productJson = product.toJSON();
      productJson.rating_average = r.rating_average;
      productJson.review_count = r.review_count;
      return productJson;
    } else {
      product.rating_average = r.rating_average;
      product.review_count = r.review_count;
      return product;
    }
  });
};

const fetchProducts = async (filters, lang = "vi") => {
  const {
    keyword, // Từ khóa tìm kiếm
    categorySlug, // Lọc theo danh mục
    brandId, // Lọc theo thương hiệu
    gender, // Lọc theo giới tính
    minPrice, // Giá từ
    maxPrice, // Giá đến
    isNew, // Hàng mới
    isFeatured, // Hàng nổi bật
    sortBy, // Sắp xếp: price_asc | price_desc | newest | best_sellers
    page = 1,
    limit = 12,
    shopId,
  } = filters;

  // 1. Xây dựng where clause động
  const where = { approval_status: "APPROVED" };
  let vectorRankedIds = null;

  if (keyword) {
    const semanticIds = await vectorSearchService.searchProductsBySemantic(keyword, 40);
    if (semanticIds && semanticIds.length > 0) {
      vectorRankedIds = semanticIds;
      console.log(`🔍 [SEMANTIC SEARCH - ${vectorSearchService.getMode().toUpperCase()}] Query: "${keyword}" -> Khớp ${semanticIds.length} vector tương đồng nhất.`);
    }
  }

  if (vectorRankedIds && vectorRankedIds.length > 0) {
    where.id = { [Op.in]: vectorRankedIds };
  } else if (keyword) {
    const { expandedTerms } = expandQueryTerms(keyword);
    const likeConds = Array.from(expandedTerms).map((term) => ({
      name: { [Op.like]: `%${term}%` },
    }));
    where[Op.or] = likeConds;
  }
  if (shopId) {
    where.shop_id = shopId;
  }
  if (gender) where.gender = gender;
  if (isNew !== undefined) where.is_new = isNew === "true";
  if (isFeatured !== undefined) where.is_featured = isFeatured === "true";

  // Lọc giá theo effective price (sale_price nếu có, nếu không dùng price)
  if (minPrice || maxPrice) {
    where.price = {};
    if (minPrice) where.price[Op.gte] = parseFloat(minPrice);
    if (maxPrice) where.price[Op.lte] = parseFloat(maxPrice);
  }

  // 2. Xây dựng include (JOIN) động
  const include = [
    {
      model: db.ProductImage,
      as: "images",
      where: { is_primary: true },
      required: false,
      separate: true, // Tránh Sequelize sinh subQuery làm mất thứ tự ORDER BY FIELD()
    },
    {
      model: db.Shop,
      as: "shop",
      attributes: ["id", "shop_name", "status", "rating", "shop_logo"],
      required: false,
    },
  ];

  // Lọc theo category slug (cần JOIN & hỗ trợ phân cấp cha-con-cháu)
  if (categorySlug) {
    const matchedCategory = await db.Category.findOne({
      where: { slug: categorySlug },
      include: [{ model: db.Category, as: "children" }]
    });

    if (matchedCategory) {
      let allCategoryIds = [matchedCategory.id];
      if (matchedCategory.children && matchedCategory.children.length > 0) {
        const childIds = matchedCategory.children.map(c => c.id);
        allCategoryIds.push(...childIds);

        // Tìm tiếp các danh mục cháu (chỉ dành cho cấp 3)
        const grandchildren = await db.Category.findAll({
          where: { parent_id: { [Op.in]: childIds } }
        });
        if (grandchildren.length > 0) {
          allCategoryIds.push(...grandchildren.map(g => g.id));
        }
      }

      where.category_id = { [Op.in]: allCategoryIds };

      include.push({
        model: db.Category,
        as: "category",
        attributes: ["id", "name", "slug"],
      });
    } else {
      include.push({
        model: db.Category,
        as: "category",
        where: { slug: categorySlug },
      });
    }
  } else {
    include.push({
      model: db.Category,
      as: "category",
      attributes: ["id", "name", "slug"],
    });
  }

  // 3. Xác định ORDER BY
  const orderMap = {
    relevance: vectorRankedIds && vectorRankedIds.length > 0
      ? [Sequelize.literal(`FIELD(\`Product\`.\`id\`, ${vectorRankedIds.join(",")})`)]
      : [["created_at", "DESC"]],
    price_asc: [["price", "ASC"]],
    price_desc: [["price", "DESC"]],
    newest: [["created_at", "DESC"]],
    best_sellers: [["sold_count", "DESC"]],
    most_viewed: [["view_count", "DESC"]],
  };

  let order = orderMap[sortBy];
  if (!order) {
    if (vectorRankedIds && vectorRankedIds.length > 0) {
      order = [Sequelize.literal(`FIELD(\`Product\`.\`id\`, ${vectorRankedIds.join(",")})`)];
    } else {
      order = [["created_at", "DESC"]];
    }
  }

  //4. Phân trang
  const offset = (page - 1) * limit;

  //5. Query
  try {
    const { count, rows } = await db.Product.findAndCountAll({
      where,
      include,
      order,
      limit: parseInt(limit),
      offset,
      distinct: true,
    });

    // Bảo toàn 100% thứ tự xếp hạng từ Vector Search (khớp tuyệt đối giữa Dropdown và Grid)
    if (vectorRankedIds && vectorRankedIds.length > 0 && (!sortBy || sortBy === "relevance")) {
      const rankMap = new Map(vectorRankedIds.map((id, idx) => [Number(id), idx]));
      rows.sort((a, b) => (rankMap.get(Number(a.id)) ?? 999999) - (rankMap.get(Number(b.id)) ?? 999999));
    }

    const enrichedProducts = await enrichProductsRating(rows);
    const translatedProducts = await enrichProductsTranslation(enrichedProducts, lang);

    return {
      total: count,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      products: translatedProducts,
    };
  } catch (error) {
    console.error("=== [productService.getProducts ERROR] ===");
    console.error("Filters used:", filters);
    console.error("Where clause:", where);
    console.error("Order clause:", order);
    console.error("Error details:", error);
    throw error;
  }
};

const fetchProductBySlug = async (slug, lang = "vi") => {
  const product = await db.Product.findOne({
    where: { slug, approval_status: "APPROVED" },
    include: [
      { model: db.Category, as: "category" },
      { model: db.ProductImage, as: "images", order: [["sort_order", "ASC"]] },
      { model: db.ProductVariant, as: "variants" },
      { model: db.Shop, as: "shop" },
    ],
  });
  if (!product) return null;

  // Tăng số lượt xem (view_count)
  await product.increment("view_count", { by: 1 });

  // Tính tổng tồn kho từ các variants
  const totalStock = product.variants
    ? product.variants.reduce((sum, v) => sum + v.stock_quantity, 0)
    : 0;

  // Tính số lượng đánh giá và điểm trung bình
  const reviewStats = await db.ProductReview.findOne({
    where: { product_id: product.id },
    attributes: [
      [db.sequelize.fn("COUNT", db.sequelize.col("id")), "review_count"],
      [db.sequelize.fn("AVG", db.sequelize.col("rating")), "rating_average"]
    ],
    raw: true
  });

  const review_count = parseInt(reviewStats?.review_count || 0, 10);
  const rating_average = parseFloat(reviewStats?.rating_average || 0);

  const productData = { ...product.toJSON(), totalStock, review_count, rating_average };
  const [translatedProduct] = await enrichProductsTranslation([productData], lang);
  return translatedProduct;
};

const getProductBySlug = (slug, lang = "vi") =>
  getOrSetCache(`products:detail:${lang}:${slug}`, () => fetchProductBySlug(slug, lang), 300);

const fetchSimilarProducts = async (categoryId, excludeProductId, limit = 6, lang = "vi") => {
  // Ưu tiên lấy sản phẩm tương tự theo Cosine Vector Similarity (nếu có)
  if (vectorSearchService.isReady() && excludeProductId) {
    const similarVectorIds = await vectorSearchService.getSimilarProductIds(excludeProductId, limit);
    if (similarVectorIds && similarVectorIds.length > 0) {
      const vectorProducts = await db.Product.findAll({
        where: {
          id: { [Op.in]: similarVectorIds },
          approval_status: "APPROVED",
        },
        include: [
          {
            model: db.Category,
            as: "category",
            attributes: ["id", "name", "slug"],
          },
          {
            model: db.ProductImage,
            as: "images",
            where: { is_primary: true },
            required: false,
          },
        ],
        order: [Sequelize.literal(`FIELD(\`Product\`.\`id\`, ${similarVectorIds.join(",")})`)],
        limit,
      });

      if (vectorProducts && vectorProducts.length > 0) {
        return await enrichProductsRating(vectorProducts);
      }
    }
  }

  const products = await db.Product.findAll({
    where: {
      category_id: categoryId,
      id: { [Op.ne]: excludeProductId }, // Loại trừ sản phẩm hiện tại
      approval_status: "APPROVED",
    },
    include: [
      {
        model: db.Category,
        as: "category",
        attributes: ["id", "name", "slug"]
      },
      {
        model: db.ProductImage,
        as: "images",
        where: { is_primary: true },
        required: false,
      },
    ],
    limit,
    order: [["sold_count", "DESC"]],
  });
  const enriched = await enrichProductsRating(products);
  return await enrichProductsTranslation(enriched, lang);
};

const getSimilarProducts = (categoryId, excludeProductId, limit = 6, lang = "vi") =>
  getOrSetCache(`products:similar:${lang}:${categoryId}:${excludeProductId}:${limit}`, () => fetchSimilarProducts(categoryId, excludeProductId, limit, lang), 600);

const fetchFeaturedProducts = async (limit = 10, lang = "vi") => {
  // Validate limit
  const parsedLimit = Number(limit) || 10;

  const products = await db.Product.findAll({
    where: {
      approval_status: "APPROVED",
      is_featured: true,
    },

    attributes: [
      "id",
      "name",
      "slug",
      "price",
      "sale_price",
      "sold_count",
      "is_new",
      "created_at",
    ],

    include: [

      {
        model: db.ProductImage,
        as: "images",

        attributes: ["id", "image_url", "is_primary"],

        where: {
          is_primary: true,
        },

        required: false,
      },

      {
        model: db.Shop,
        as: "shop",
        attributes: ["id", "shop_name", "status", "rating", "shop_logo"],
        where: {
          status: "APPROVED",
          rating: { [Op.gte]: 4.0 },
        },
      },
    ],

    order: [
      ["sold_count", "DESC"],
      ["created_at", "DESC"],
    ],

    limit: parsedLimit,

    subQuery: false,
  });
  const enriched = await enrichProductsRating(products);
  return await enrichProductsTranslation(enriched, lang);
};

const fetchNewestProducts = async (limit = 10, lang = "vi") => {
  const parsedLimit = Number(limit) || 10;

  const products = await db.Product.findAll({
    where: {
      approval_status: "APPROVED",
      is_new: true,
    },

    attributes: [
      "id",
      "name",
      "slug",
      "price",
      "sale_price",
      "sold_count",
      "is_new",
      "created_at",
    ],

    include: [

      {
        model: db.ProductImage,
        as: "images",

        attributes: ["id", "image_url", "is_primary"],

        where: {
          is_primary: true,
        },

        required: false,
      },

      {
        model: db.Shop,
        as: "shop",
        attributes: ["id", "shop_name", "status", "rating", "shop_logo"],
        where: {
          status: "APPROVED",
          rating: { [Op.gte]: 4.0 },
        },
      },
    ],

    order: [
      ["created_at", "DESC"], // Mới nhất -> cũ nhất
    ],

    limit: parsedLimit,

    subQuery: false,
  });
  const enriched = await enrichProductsRating(products);
  return await enrichProductsTranslation(enriched, lang);
};

const fetchBestSellerProducts = async (limit = 10, lang = "vi") => {
  const parsedLimit = Number(limit) || 10;

  const products = await db.Product.findAll({
    where: {
      approval_status: "APPROVED",
    },

    attributes: [
      "id",
      "name",
      "slug",
      "price",
      "sale_price",
      "sold_count",
      "is_new",
      "created_at",
    ],

    include: [

      {
        model: db.ProductImage,
        as: "images",

        attributes: ["id", "image_url", "is_primary"],

        where: {
          is_primary: true,
        },

        required: false,
      },

      {
        model: db.Shop,
        as: "shop",
        attributes: ["id", "shop_name", "status", "rating", "shop_logo"],
        where: {
          status: "APPROVED",
          rating: { [Op.gte]: 4.0 },
        },
      },
    ],

    order: [["sold_count", "DESC"]],

    limit: parsedLimit,

    subQuery: false,
  });
  const enriched = await enrichProductsRating(products);
  return await enrichProductsTranslation(enriched, lang);
};

const fetchMostViewedProducts = async (limit = 10, lang = "vi") => {
  const parsedLimit = Number(limit) || 10;

  const products = await db.Product.findAll({
    where: {
      approval_status: "APPROVED",
    },

    attributes: [
      "id",
      "name",
      "slug",
      "price",
      "sale_price",
      "sold_count",
      "view_count",
      "is_new",
      "created_at",
    ],

    include: [
      {
        model: db.ProductImage,
        as: "images",
        attributes: ["id", "image_url", "is_primary"],
        where: {
          is_primary: true,
        },
        required: false,
      },
      {
        model: db.Shop,
        as: "shop",
        attributes: ["id", "shop_name", "status", "rating", "shop_logo"],
        where: {
          status: "APPROVED",
          rating: { [Op.gte]: 4.0 },
        },
      },
    ],

    order: [["view_count", "DESC"]],
    limit: parsedLimit,
    subQuery: false,
  });
  const enriched = await enrichProductsRating(products);
  return await enrichProductsTranslation(enriched, lang);
};

// POST /products/:id/favorite
const toggleFavorite = async (userId, productId) => {
  const existingFavorite = await db.Wishlist.findOne({
    where: { user_id: userId, product_id: productId }
  });

  if (existingFavorite) {
    await existingFavorite.destroy();
    return { status: "removed", message: "Đã bỏ yêu thích sản phẩm." };
  } else {
    await db.Wishlist.create({ user_id: userId, product_id: productId });
    return { status: "added", message: "Đã thêm vào danh sách yêu thích." };
  }
};

// POST /products/:id/view
const recordView = async (userId, productId) => {
  // Tăng view_count của Product
  await db.Product.increment('view_count', { by: 1, where: { id: productId } });

  if (userId) {
    const [viewed, created] = await db.UserViewedProduct.findOrCreate({
      where: { user_id: userId, product_id: productId },
      defaults: { viewed_at: new Date() }
    });
    if (!created) {
      await viewed.update({ viewed_at: new Date() });
    }
  }

  return true;
};

// Xáo trộn xen kẽ sản phẩm theo danh mục (kiểu Shopee Gợi ý hôm nay)
const interleaveProductsByCategory = (products, limit) => {
  if (!Array.isArray(products) || products.length === 0) return [];
  const buckets = new Map();
  for (const p of products) {
    const catKey = p.category_id || p.category?.id || "other";
    if (!buckets.has(catKey)) buckets.set(catKey, []);
    buckets.get(catKey).push(p);
  }

  const queues = Array.from(buckets.values());
  const result = [];
  let hasMore = true;
  while (hasMore && result.length < limit) {
    hasMore = false;
    for (const q of queues) {
      if (q.length > 0 && result.length < limit) {
        result.push(q.shift());
        hasMore = true;
      }
    }
  }
  return result;
};

// GET /products/recommendations
const getRecommendedProducts = async (userId, viewedIdsParam, limit = 10, lang = "vi") => {
  const parsedLimit = Number(limit) || 10;
  let browserViewedIds = [];
  const signalWeights = {};

  if (Array.isArray(viewedIdsParam) && viewedIdsParam.length > 0) {
    browserViewedIds = viewedIdsParam.map(Number).filter((n) => !isNaN(n) && n > 0);
  } else if (typeof viewedIdsParam === "string" && viewedIdsParam.trim()) {
    browserViewedIds = viewedIdsParam
      .split(",")
      .map((s) => Number(s.trim()))
      .filter((n) => !isNaN(n) && n > 0);
  }

  let viewedIds = [...browserViewedIds];
  let purchasedIds = [];
  let cartProductIds = [];
  const interactions = browserViewedIds.map((pid) => ({
    productId: pid,
    eventType: "view_item",
    timestamp: Date.now(),
  }));

  if (userId) {
    const [history, wishlists, cartItems, orderItems] = await Promise.all([
      db.UserViewedProduct.findAll({
        where: { user_id: userId },
        order: [["viewed_at", "DESC"]],
        limit: 15,
        attributes: ["product_id", "viewed_at"],
        raw: true,
      }),
      db.Wishlist.findAll({
        where: { user_id: userId },
        order: [["added_at", "DESC"]],
        limit: 10,
        attributes: ["product_id", "added_at"],
        raw: true,
      }),
      db.CartItem.findAll({
        where: { user_id: userId },
        include: [
          {
            model: db.ProductVariant,
            as: "variant",
            attributes: ["product_id"],
            required: true,
          },
        ],
        limit: 10,
      }),
      db.OrderItem.findAll({
        include: [
          {
            model: db.ProductVariant,
            as: "variant",
            attributes: ["product_id"],
            required: true,
          },
          {
            model: db.ShopOrder,
            as: "shopOrder",
            attributes: ["created_at", "status"],
            where: { status: { [Op.notIn]: ["CANCELLED", "RETURNED"] } },
            required: true,
            include: [
              {
                model: db.ParentOrder,
                as: "parentOrder",
                attributes: [],
                where: { user_id: userId },
                required: true,
              },
            ],
          },
        ],
        order: [["id", "DESC"]],
        limit: 20,
      }),
    ]);

    const dbViewedIds = history.map((h) => Number(h.product_id));
    const wishlistIds = wishlists.map((w) => Number(w.product_id));
    cartProductIds = cartItems
      .map((c) => Number(c.variant?.product_id))
      .filter((id) => !isNaN(id) && id > 0);
    purchasedIds = Array.from(
      new Set(
        orderItems
          .map((oi) => Number(oi.variant?.product_id))
          .filter((id) => !isNaN(id) && id > 0)
      )
    );

    history.forEach((h) => {
      const pid = Number(h.product_id);
      if (pid > 0) {
        interactions.push({
          productId: pid,
          eventType: "view_item",
          timestamp: h.viewed_at ? new Date(h.viewed_at).getTime() : Date.now(),
        });
      }
    });
    wishlists.forEach((w) => {
      const pid = Number(w.product_id);
      if (pid > 0) {
        signalWeights[pid] = Math.max(signalWeights[pid] || 1, 1.3);
        interactions.push({
          productId: pid,
          eventType: "wishlist",
          timestamp: w.added_at ? new Date(w.added_at).getTime() : Date.now(),
        });
      }
    });
    cartItems.forEach((c) => {
      const pid = Number(c.variant?.product_id);
      if (pid > 0) {
        signalWeights[pid] = Math.max(signalWeights[pid] || 1, 1.5);
        interactions.push({
          productId: pid,
          eventType: "add_to_cart",
          timestamp: c.added_at ? new Date(c.added_at).getTime() : Date.now(),
        });
      }
    });
    orderItems.forEach((oi) => {
      const pid = Number(oi.variant?.product_id);
      if (pid > 0) {
        interactions.push({
          productId: pid,
          eventType: "purchase",
          timestamp: oi.shopOrder?.created_at
            ? new Date(oi.shopOrder.created_at).getTime()
            : Date.now(),
        });
      }
    });

    // Ưu tiên lịch sử DB của chính user + browserViewedIds của user đó
    viewedIds = Array.from(
      new Set([...dbViewedIds, ...cartProductIds, ...wishlistIds, ...purchasedIds, ...browserViewedIds])
    ).slice(0, 20);
  }

  interactions.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

  if ((interactions.length > 0 || viewedIds.length > 0) && vectorSearchService.isReady()) {
    const overFetchLimit = Math.min(240, Math.max(parsedLimit * 3, 60));
    const recommendedIds = await vectorSearchService.getRecommendationsByUserHistory(
      {
        interactions: interactions.slice(0, 20),
        viewedProductIds: viewedIds,
        purchasedIds,
        inCartIds: cartProductIds,
        filterMode: "hard",
      },
      overFetchLimit,
      signalWeights
    );
    if (recommendedIds && recommendedIds.length > 0) {
      const products = await db.Product.findAll({
        where: {
          id: { [Op.in]: recommendedIds },
          approval_status: "APPROVED",
        },
        include: [
          {
            model: db.Category,
            as: "category",
            attributes: ["id", "name", "slug"],
          },
          {
            model: db.ProductImage,
            as: "images",
            where: { is_primary: true },
            required: false,
            separate: true,
          },
          {
            model: db.Shop,
            as: "shop",
            attributes: ["id", "shop_name", "status", "rating", "shop_logo"],
            required: false,
          },
        ],
        order: [Sequelize.literal(`FIELD(\`Product\`.\`id\`, ${recommendedIds.join(",")})`)],
        limit: overFetchLimit,
      });
      if (products.length > 0) {
        const interleaved = interleaveProductsByCategory(products, parsedLimit);
        const rated = await enrichProductsRating(interleaved);
        return await enrichProductsTranslation(rated, lang);
      }
    }
  }

  // Với Guest hoặc tài khoản mới chưa có lịch sử: lấy nguồn sản phẩm đa dạng rồi xen kẽ theo danh mục
  const diversePool = await fetchFeaturedProducts(Math.min(180, Math.max(parsedLimit * 3, 60)), lang);
  return interleaveProductsByCategory(diversePool, parsedLimit);
};

const normalizeFiltersKey = (filters) => {
  if (!filters || typeof filters !== "object") return "";
  return Object.keys(filters)
    .sort()
    .filter((k) => filters[k] !== undefined && filters[k] !== "")
    .map((k) => `${k}=${filters[k]}`)
    .join("&");
};

const SUGGEST_VI_EN_MAP = [
  ["op lung dien thoai", ["phone case", "case"]],
  ["ốp lưng điện thoại", ["phone case", "case"]],
  ["op lung", ["phone case", "case"]],
  ["ốp lưng", ["phone case", "case"]],
  ["tai nghe", ["headphone", "headphones", "earphone", "earbud", "earbuds", "headset"]],
  ["giay the thao", ["sneaker", "sneakers", "running shoe", "shoes"]],
  ["giày thể thao", ["sneaker", "sneakers", "running shoe", "shoes"]],
  ["giay", ["shoe", "shoes", "boot", "boots", "sneaker", "sandal"]],
  ["giày", ["shoe", "shoes", "boot", "boots", "sneaker", "sandal"]],
  ["dep", ["sandal", "sandals", "slipper", "slippers"]],
  ["dép", ["sandal", "sandals", "slipper", "slippers"]],
  ["tui xach", ["handbag", "bag", "tote", "purse"]],
  ["túi xách", ["handbag", "bag", "tote", "purse"]],
  ["tui", ["bag", "tote", "backpack", "handbag", "purse", "pouch"]],
  ["túi", ["bag", "tote", "backpack", "handbag", "purse", "pouch"]],
  ["balo", ["backpack", "bag"]],
  ["ba lo", ["backpack", "bag"]],
  ["dong ho", ["watch", "smartwatch", "clock"]],
  ["đồng hồ", ["watch", "smartwatch", "clock"]],
  ["ao thun", ["t-shirt", "tee", "shirt"]],
  ["áo thun", ["t-shirt", "tee", "shirt"]],
  ["ao", ["shirt", "t-shirt", "jacket", "hoodie", "sweater", "top", "blouse"]],
  ["áo", ["shirt", "t-shirt", "jacket", "hoodie", "sweater", "top", "blouse"]],
  ["quan", ["pants", "jeans", "trousers", "shorts"]],
  ["quần", ["pants", "jeans", "trousers", "shorts"]],
  ["tra", ["tea", "tea bags"]],
  ["trà", ["tea", "tea bags"]],
  ["ca phe", ["coffee"]],
  ["cà phê", ["coffee"]],
  ["dien thoai", ["phone", "smartphone", "iphone", "samsung"]],
  ["điện thoại", ["phone", "smartphone", "iphone", "samsung"]],
  ["ban phim", ["keyboard"]],
  ["bàn phím", ["keyboard"]],
  ["chuot", ["mouse"]],
  ["chuột", ["mouse"]],
  ["nhan", ["ring", "rings"]],
  ["nhẫn", ["ring", "rings"]],
  ["day chuyen", ["necklace", "pendant", "chain"]],
  ["dây chuyền", ["necklace", "pendant", "chain"]],
  ["bong tai", ["earring", "earrings"]],
  ["bông tai", ["earring", "earrings"]],
  ["vong tay", ["bracelet", "bangle"]],
  ["vòng tay", ["bracelet", "bangle"]],
  ["tu quan ao", ["wardrobe", "closet"]],
  ["tủ quần áo", ["wardrobe", "closet"]],
  ["tu", ["cabinet", "wardrobe", "dresser", "cupboard", "sideboard", "chest"]],
  ["tủ", ["cabinet", "wardrobe", "dresser", "cupboard", "sideboard", "chest"]],
  ["ke", ["shelf", "shelves", "bookshelf", "rack"]],
  ["kệ", ["shelf", "shelves", "bookshelf", "rack"]],
  ["ban", ["table", "desk", "nightstand"]],
  ["bàn", ["table", "desk", "nightstand"]],
  ["ghe", ["chair", "sofa", "couch", "stool", "armchair"]],
  ["ghế", ["chair", "sofa", "couch", "stool", "armchair"]],
  ["giuong", ["bed", "bedframe", "mattress"]],
  ["giường", ["bed", "bedframe", "mattress"]],
  ["den", ["lamp", "light", "chandelier"]],
  ["đèn", ["lamp", "light", "chandelier"]],
  ["tham", ["rug", "carpet", "mat"]],
  ["thảm", ["rug", "carpet", "mat"]],
  ["goi", ["pillow", "cushion"]],
  ["gối", ["pillow", "cushion"]],
  ["kinh", ["glasses", "sunglasses", "eyewear"]],
  ["kính", ["glasses", "sunglasses", "eyewear"]],
];

const stripAccents = (str = "") =>
  String(str)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();

const hasWordBoundaryMatch = (textLower, term) => {
  if (!textLower || !term) return false;
  if (term.includes(" ")) return textLower.includes(term);
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(^|[^a-z0-9\\u00C0-\\u1EF9])${escaped}([^a-z0-9\\u00C0-\\u1EF9]|$)`, "i");
  return regex.test(textLower);
};

const expandQueryTerms = (rawQuery) => {
  const clean = String(rawQuery || "").trim();
  const cleanLower = clean.toLowerCase();
  const normalized = stripAccents(clean);
  const expandedTerms = new Set([cleanLower]);
  const translatedTerms = new Set();

  for (const [viPhrase, enList] of SUGGEST_VI_EN_MAP) {
    const viNorm = stripAccents(viPhrase);
    if (hasWordBoundaryMatch(normalized, viNorm)) {
      enList.forEach((en) => {
        expandedTerms.add(en);
        translatedTerms.add(en);
      });
    }
  }

  return { clean, cleanLower, normalized, expandedTerms, translatedTerms };
};

const hasAccentSafeKeywordMatch = (productName, cleanLower, normalized, translatedTerms) => {
  const nameLower = String(productName || "").toLowerCase();
  if (!nameLower) return false;

  // 1. Khớp chính xác chuỗi có dấu người dùng gõ (hoặc word-boundary nếu query không dấu)
  const hasVietnameseDiacritics = cleanLower !== normalized;
  if (hasVietnameseDiacritics) {
    if (nameLower.includes(cleanLower)) return true;
  } else if (hasWordBoundaryMatch(nameLower, cleanLower)) {
    return true;
  }

  // 2. Khớp các từ khóa tiếng Anh đã dịch theo ranh giới từ (tránh "ring" dính "earring"/"during")
  for (const term of translatedTerms) {
    if (hasWordBoundaryMatch(nameLower, term)) return true;
  }

  return false;
};

const fetchProductSuggestions = async (rawQuery, limit = 6, lang = "vi") => {
  const clean = String(rawQuery || "").trim();
  if (clean.length < 2) {
    return { products: [], total: 0 };
  }

  const parsedLimit = Math.min(12, Math.max(1, parseInt(limit, 10) || 6));
  const { cleanLower, normalized, expandedTerms, translatedTerms } = expandQueryTerms(clean);

  // Tầng 1: Ưu tiên gọi Vector Search (Qwen3-VL /embed + Reranker) qua Analytics Service
  const candidateMap = new Map();
  let totalMatched = 0;

  try {
    const semanticIds = await vectorSearchService.searchProductsBySemantic(
      clean,
      Math.max(parsedLimit * 3, 18)
    );
    if (Array.isArray(semanticIds) && semanticIds.length > 0) {
      const semanticProducts = await db.Product.findAll({
        where: {
          id: { [Op.in]: semanticIds },
          approval_status: "APPROVED",
        },
        attributes: ["id", "name", "slug", "price", "sale_price", "sold_count"],
        include: [
          {
            model: db.ProductImage,
            as: "images",
            attributes: ["image_url"],
            where: { is_primary: true },
            required: false,
            separate: true,
          },
        ],
      });
      const rankMap = new Map(semanticIds.map((id, idx) => [Number(id), idx]));
      semanticProducts
        .sort((a, b) => (rankMap.get(Number(a.id)) ?? 999999) - (rankMap.get(Number(b.id)) ?? 999999))
        .forEach((p) => candidateMap.set(Number(p.id), { prod: p, semanticRank: rankMap.get(Number(p.id)) ?? 999 }));
      totalMatched = semanticProducts.length;
    }
  } catch (err) {
    console.warn("⚠️ [SUGGEST] Semantic vector search fallback:", err.message);
  }

  // Tầng 2: Bổ sung / Dự phòng SQL LIKE có hậu kiểm chống khớp nhầm dấu MySQL (ví dụ "tủ" != "Artum"/"Latitude")
  if (candidateMap.size < parsedLimit) {
    const rawTokens = cleanLower.split(/\s+/).filter((t) => t.length >= 2);
    const orConditions = [];
    for (const term of expandedTerms) {
      orConditions.push({ name: { [Op.like]: `%${term}%` } });
    }
    if (rawTokens.length > 1) {
      orConditions.push({
        [Op.and]: rawTokens.map((token) => ({
          name: { [Op.like]: `%${token}%` },
        })),
      });
    }

    const sqlCandidates = await db.Product.findAll({
      where: {
        approval_status: "APPROVED",
        [Op.or]: orConditions,
      },
      attributes: ["id", "name", "slug", "price", "sale_price", "sold_count"],
      include: [
        {
          model: db.ProductImage,
          as: "images",
          attributes: ["image_url"],
          where: { is_primary: true },
          required: false,
          separate: true,
        },
      ],
      limit: 40,
      order: [["sold_count", "DESC"], ["id", "DESC"]],
    });

    const verifiedSql = sqlCandidates.filter((prod) =>
      hasAccentSafeKeywordMatch(prod.name, cleanLower, normalized, translatedTerms)
    );

    verifiedSql.forEach((prod) => {
      if (!candidateMap.has(Number(prod.id))) {
        candidateMap.set(Number(prod.id), { prod, semanticRank: null });
      }
    });
    totalMatched = Math.max(totalMatched, candidateMap.size);
  }

  const rawTokens = cleanLower.split(/\s+/).filter((t) => t.length >= 2);
  const scored = Array.from(candidateMap.values())
    .map(({ prod, semanticRank }) => {
      const nameLower = String(prod.name || "").toLowerCase();
      let score = semanticRank !== null ? Math.max(60, 150 - semanticRank * 4) : 0;

      if (nameLower.startsWith(cleanLower)) score += 120;
      else if (hasAccentSafeKeywordMatch(prod.name, cleanLower, normalized, translatedTerms)) score += 85;

      let matchedTokens = 0;
      for (const token of rawTokens) {
        if (hasWordBoundaryMatch(nameLower, token)) matchedTokens++;
      }
      score += matchedTokens * 20;

      for (const term of translatedTerms) {
        if (hasWordBoundaryMatch(nameLower, term)) {
          score += 40;
          break;
        }
      }
      score += Math.min(15, Number(prod.sold_count || 0) / 20);
      return { prod, score };
    })
    .sort((a, b) => b.score - a.score);

  const topItems = scored.slice(0, parsedLimit).map((item) => item.prod);
  const translated = await enrichProductsTranslation(topItems, lang);

  return {
    products: translated,
    total: totalMatched,
  };
};

const getProductSuggestions = (q, limit = 6, lang = "vi") => {
  const clean = String(q || "").trim();
  if (clean.length < 2) return Promise.resolve({ products: [], total: 0 });
  return getOrSetCache(
    `products:suggest:v2:${lang}:${limit}:${clean.toLowerCase()}`,
    () => fetchProductSuggestions(clean, limit, lang),
    60
  );
};

const getProducts = (filters = {}, lang = "vi") =>
  getOrSetCache(`products:list:v2:${lang}:${normalizeFiltersKey(filters)}`, () => fetchProducts(filters, lang), 300);

const getFeaturedProducts = (limit = 10, lang = "vi") =>
  getOrSetCache(`products:featured:${limit}:${lang}`, () => fetchFeaturedProducts(limit, lang), 900);

const getNewestProducts = (limit = 10, lang = "vi") =>
  getOrSetCache(`products:newest:${limit}:${lang}`, () => fetchNewestProducts(limit, lang), 900);

const getBestSellerProducts = (limit = 10, lang = "vi") =>
  getOrSetCache(`products:best_sellers:${limit}:${lang}`, () => fetchBestSellerProducts(limit, lang), 900);

const getMostViewedProducts = (limit = 10, lang = "vi") =>
  getOrSetCache(`products:most_viewed:${limit}:${lang}`, () => fetchMostViewedProducts(limit, lang), 900);

export default {
  enrichProductsTranslation,
  getProductSuggestions,
  getProducts,
  getProductBySlug,
  getSimilarProducts,
  getFeaturedProducts,
  getNewestProducts,
  getBestSellerProducts,
  getMostViewedProducts,
  getRecommendedProducts,
  toggleFavorite,
  recordView,
};
