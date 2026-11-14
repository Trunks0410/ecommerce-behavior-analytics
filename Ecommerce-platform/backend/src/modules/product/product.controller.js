import productService from "./product.service.js";
import visualSimilarityService from "./visualSimilarity.service.js";

// POST /products/visual-search
const visualSearch = async (req, res, next) => {
  try {
    const fileBuffer = req.file ? req.file.buffer : null;
    let clientMetadata = {};
    if (req.body.metadata) {
      try {
        clientMetadata = typeof req.body.metadata === "string" ? JSON.parse(req.body.metadata) : req.body.metadata;
      } catch (e) {
        clientMetadata = {};
      }
    }

    if (req.file?.originalname && !clientMetadata.originalFileName) {
      clientMetadata.originalFileName = req.file.originalname;
    }

    const categoryId = req.query.categoryId || req.body.categoryId || null;
    const limit = Number(req.query.limit || req.body.limit) || 24;
    const page = Number(req.query.page || req.body.page) || 1;

    const result = await visualSimilarityService.searchProductsByImage({
      fileBuffer,
      clientMetadata,
      categoryId,
      limit,
      page,
    });

    const lang = getReqLang(req);
    if (result && result.products && result.products.length > 0) {
      result.products = await productService.enrichProductsTranslation(result.products, lang);
    }

    return res.status(200).json({
      message: "Visual search completed successfully",
      data: result,
    });
  } catch (error) {
    return next(error);
  }
};

const getReqLang = (req) => {
  const queryLang = req.query.lang;
  if (queryLang) return queryLang.toLowerCase().startsWith("en") ? "en" : "vi";
  const headerLang = req.headers["accept-language"];
  if (headerLang) {
    const primary = headerLang.split(",")[0].trim().toLowerCase();
    if (primary.startsWith("en")) return "en";
    if (primary.startsWith("vi")) return "vi";
  }
  return "vi";
};

// GET /products?keyword=&categorySlug=&gender=&minPrice=&maxPrice=&sortBy=&page=
const getProducts = async (req, res, next) => {
  try {
    const filters = req.query;
    const lang = getReqLang(req);
    const products = await productService.getProducts(filters, lang);
    return res.status(200).json({ message: "Success", data: products });
  } catch (error) {
    return next(error);
  }
};

// GET /products/:slug
const getProductBySlug = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const lang = getReqLang(req);
    const product = await productService.getProductBySlug(slug, lang);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    return res.status(200).json({ message: "Success", data: product });
  } catch (error) {
    return next(error);
  }
};

// GET /products/:slug/similar
const getSimilarProducts = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const lang = getReqLang(req);
    const product = await productService.getProductBySlug(slug, lang);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    const similarProducts = await productService.getSimilarProducts(
      product.category_id,
      product.id,
      6,
      lang
    );
    return res.status(200).json({ message: "Success", data: similarProducts });
  } catch (error) {
    return next(error);
  }
};

// GET /products/featured
const getFeaturedProducts = async (req, res, next) => {
  try {
    const limit = req.query.limit || 10;
    const lang = getReqLang(req);
    const featuredProducts = await productService.getFeaturedProducts(limit, lang);
    return res.status(200).json({ message: "Success", data: featuredProducts });
  } catch (error) {
    return next(error);
  }
};

// GET /products/newest
const getNewestProducts = async (req, res, next) => {
  try {
    const limit = req.query.limit || 10;
    const lang = getReqLang(req);
    const newestProducts = await productService.getNewestProducts(limit, lang);
    return res.status(200).json({ message: "Success", data: newestProducts });
  } catch (error) {
    return next(error);
  }
};

// GET /products/best-sellers
const getBestSellerProducts = async (req, res, next) => {
  try {
    const limit = req.query.limit || 10;
    const lang = getReqLang(req);
    const bestSellerProducts =
      await productService.getBestSellerProducts(limit, lang);
    return res
      .status(200)
      .json({ message: "Success", data: bestSellerProducts });
  } catch (error) {
    return next(error);
  }
};

// GET /products/most-viewed
const getMostViewedProducts = async (req, res, next) => {
  try {
    const limit = req.query.limit || 10;
    const lang = getReqLang(req);
    const mostViewedProducts = await productService.getMostViewedProducts(limit, lang);
    return res.status(200).json({ message: "Success", data: mostViewedProducts });
  } catch (error) {
    return next(error);
  }
};

// POST /products/:id/favorite
const toggleFavorite = async (req, res, next) => {
  try {
    const productId = req.params.id;
    const userId = req.user.id; 

    const result = await productService.toggleFavorite(userId, productId);
    return res.status(result.status === "added" ? 201 : 200).json({ message: result.message });
  } catch (error) {
    return next(error);
  }
};

// POST /products/:id/view
const recordView = async (req, res, next) => {
  try {
    const productId = req.params.id;
    const userId = req.user ? req.user.id : null; 

    await productService.recordView(userId, productId);

    return res.status(200).json({ message: "Đã ghi nhận lượt xem." });
  } catch (error) {
    return next(error);
  }
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
  visualSearch,
};
