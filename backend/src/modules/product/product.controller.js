import productService from "./product.service.js";

// GET /products?keyword=&categorySlug=&gender=&minPrice=&maxPrice=&sortBy=&page=
const getProducts = async (req, res, next) => {
  try {
    const filters = req.query;
    const products = await productService.getProducts(filters);
    return res.status(200).json({ message: "Success", data: products });
  } catch (error) {
    return next(error);
  }
};

// GET /products/:slug
const getProductBySlug = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const product = await productService.getProductBySlug(slug);
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
    const product = await productService.getProductBySlug(slug);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    const similarProducts = await productService.getSimilarProducts(
      product.category_id,
      product.id,
      6,
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
    const featuredProducts = await productService.getFeaturedProducts(limit);
    return res.status(200).json({ message: "Success", data: featuredProducts });
  } catch (error) {
    return next(error);
  }
};

// GET /products/newest
const getNewestProducts = async (req, res, next) => {
  try {
    const limit = req.query.limit || 10;
    const newestProducts = await productService.getNewestProducts(limit);
    return res.status(200).json({ message: "Success", data: newestProducts });
  } catch (error) {
    return next(error);
  }
};

// GET /products/best-sellers
const getBestSellerProducts = async (req, res, next) => {
  try {
    const limit = req.query.limit || 10;
    const bestSellerProducts =
      await productService.getBestSellerProducts(limit);
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
    const mostViewedProducts = await productService.getMostViewedProducts(limit);
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
};
