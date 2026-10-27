import db from "../../database/models/index.js";
import { Op } from "sequelize";

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

const getProducts = async (filters) => {
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

  if (keyword) {
    where.name = { [Op.like]: `%${keyword}%` };
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
    price_asc: [["price", "ASC"]],
    price_desc: [["price", "DESC"]],
    newest: [["created_at", "DESC"]],
    best_sellers: [["sold_count", "DESC"]],
    most_viewed: [["view_count", "DESC"]],
  };

  const order = orderMap[sortBy] || [["created_at", "DESC"]];

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

    const enrichedProducts = await enrichProductsRating(rows);

    return {
      total: count,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      products: enrichedProducts,
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

const getProductBySlug = async (slug) => {
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

  return { ...product.toJSON(), totalStock, review_count, rating_average };

};

const getSimilarProducts = async (categoryId, excludeProductId, limit = 6) => {
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
  return await enrichProductsRating(products);
};

const getFeaturedProducts = async (limit = 10) => {
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
  return await enrichProductsRating(products);
};

const getNewestProducts = async (limit = 10) => {
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
  return await enrichProductsRating(products);
};

const getBestSellerProducts = async (limit = 10) => {
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
  return await enrichProductsRating(products);
};

const getMostViewedProducts = async (limit = 10) => {
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
  return await enrichProductsRating(products);
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

export default {
  getProducts,
  getProductBySlug,
  getSimilarProducts,
  getFeaturedProducts,
  getNewestProducts,
  getBestSellerProducts,
  getMostViewedProducts,
  toggleFavorite,
  recordView,
};
