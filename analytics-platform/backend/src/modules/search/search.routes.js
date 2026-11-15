import express from "express";
import {
  getHealth,
  searchProducts,
  getSimilarProducts,
  getRecommendations,
  upsertVector,
  deleteVector,
  syncDbVectors,
} from "./search.controller.js";

const router = express.Router();

// Search endpoints
router.get("/search", searchProducts);
router.post("/search", searchProducts);

// Recommendations & Similar endpoints
router.get("/similar/:productId", getSimilarProducts);
router.post("/recommend", getRecommendations);
router.post("/user-history", getRecommendations);

// Vector management endpoints
router.get("/status", getHealth);
router.post("/upsert/:productId", upsertVector);
router.delete("/:productId", deleteVector);
router.post("/sync-db", syncDbVectors);

export default router;
