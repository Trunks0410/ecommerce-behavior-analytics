import productService from "./product.service.js";
import vectorSearchService from "./vectorSearch.service.js";

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

// GET /products/recommendations
const getRecommendedProducts = async (req, res, next) => {
  try {
    const userId = req.user ? req.user.id : null;
    const { viewedIds, limit = 10 } = req.query;
    const products = await productService.getRecommendedProducts(userId, viewedIds, limit);
    return res.status(200).json({ message: "Success", data: products });
  } catch (error) {
    return next(error);
  }
};

// GET /products/vector/status
const getVectorStatus = async (req, res, next) => {
  try {
    const status = await vectorSearchService.getStatus();
    return res.status(200).json({ message: "Success", data: status });
  } catch (error) {
    return next(error);
  }
};

// POST /products/vector/mode
const switchVectorMode = async (req, res, next) => {
  try {
    const { mode } = req.body;
    const status = await vectorSearchService.setMode(mode);
    return res.status(200).json({
      message: `Đã chuyển chế độ Vector Search sang ${status.mode.toUpperCase()}`,
      data: status,
    });
  } catch (error) {
    return next(error);
  }
};

// POST /products/vector/sync
const syncVectorDatabase = async (req, res, next) => {
  try {
    const result = await vectorSearchService.syncDatabaseVectors();
    return res.status(200).json({
      message: "Đồng bộ Vector từ Database hoàn tất",
      data: result,
    });
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
  getRecommendedProducts,
  getVectorStatus,
  switchVectorMode,
  syncVectorDatabase,
  toggleFavorite,
  recordView,
  visualSearch,
};
