import express from "express";
import shipperController from "../controllers/shipper.controller.js";
import { verifyToken, isShipper } from "../middleware/auth.js";
import upload from "../middleware/upload.js";

const router = express.Router();

// Shipper Authentication (Dedicated Portal Login)
router.post("/login", shipperController.login);

// Shipper Profile
router.get("/profile", verifyToken, shipperController.getProfile);
router.put("/profile", verifyToken, shipperController.updateProfile);

// Shipper Orders
router.get("/orders", verifyToken, isShipper, shipperController.getShipperOrders);

// COD & Reconciliation
router.get("/cod/collected", verifyToken, isShipper, shipperController.getCollectedCOD);
router.post("/cod/reconcile", verifyToken, isShipper, shipperController.submitCODReconciliation);
router.get("/cod/reconciliations", verifyToken, isShipper, shipperController.getReconciliationHistory);

// Proof of delivery & avatar uploads
router.post("/upload", verifyToken, upload.array("images", 5), shipperController.uploadImages);

export default router;
