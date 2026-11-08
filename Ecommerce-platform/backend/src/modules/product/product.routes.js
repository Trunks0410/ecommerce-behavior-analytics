import express from "express";
import productController from "./product.controller.js";
import { verifyToken, optionalVerifyToken } from "../../core/middleware/auth.js";
import reviewRoute from "../review/review.routes.js";

const router = express.Router();

router.use("/:id/reviews", reviewRoute);


router.get("/featured", productController.getFeaturedProducts);
router.get("/newest", productController.getNewestProducts);
router.get("/best-sellers", productController.getBestSellerProducts);
router.get("/most-viewed", productController.getMostViewedProducts);
router.get("/recommendations", optionalVerifyToken, productController.getRecommendedProducts);

// Quản lý cấu hình & đồng bộ Vector Search (Option 1: RAM | Option 2: Microservice)
router.get("/vector/status", productController.getVectorStatus);
router.post("/vector/mode", productController.switchVectorMode);
router.post("/vector/sync", productController.syncVectorDatabase);

router.get("/", productController.getProducts);
router.get("/:slug", productController.getProductBySlug);
router.get("/:slug/similar", productController.getSimilarProducts);

// router.post("/:id/favorite", authMiddleware.verifyToken, productController.toggleFavorite);
router.post("/:id/favorite", verifyToken, productController.toggleFavorite);

// Ghi nhận lượt xem không cần auth (tùy chọn)
router.post("/:id/view", optionalVerifyToken, productController.recordView);

export default router;
