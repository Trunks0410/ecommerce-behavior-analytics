import express from "express";
import multer from "multer";
import productController from "./product.controller.js";
import { verifyToken, optionalVerifyToken } from "../../core/middleware/auth.js";
import reviewRoute from "../review/review.routes.js";

const router = express.Router();

const memoryUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

router.use("/:id/reviews", reviewRoute);

router.get("/featured", productController.getFeaturedProducts);
router.get("/newest", productController.getNewestProducts);
router.get("/best-sellers", productController.getBestSellerProducts);
router.get("/most-viewed", productController.getMostViewedProducts);

// Tìm kiếm bằng hình ảnh (Visual Search - Shopee & TikTok Style)
router.post("/visual-search", memoryUpload.single("image"), productController.visualSearch);

router.get("/", productController.getProducts);
router.get("/:slug", productController.getProductBySlug);
router.get("/:slug/similar", productController.getSimilarProducts);

// router.post("/:id/favorite", authMiddleware.verifyToken, productController.toggleFavorite);
router.post("/:id/favorite", verifyToken, productController.toggleFavorite);

// Ghi nhận lượt xem không cần auth (tùy chọn)
router.post("/:id/view", optionalVerifyToken, productController.recordView);

export default router;
