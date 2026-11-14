import express from "express";
import shipperController from "../controllers/shipper.controller.js";
import { isShipper, verifyToken } from "../middleware/auth.js";
import upload from "../middleware/upload.js";

const router = express.Router();

router.post("/login", shipperController.login);
router.get("/profile", verifyToken, shipperController.getProfile);
router.put("/profile", verifyToken, isShipper, shipperController.updateProfile);
router.get("/orders", verifyToken, isShipper, shipperController.getShipperOrders);
router.get("/cod/collected", verifyToken, isShipper, shipperController.getCollectedCOD);
router.post("/upload", verifyToken, isShipper, upload.array("images", 5), shipperController.uploadImages);

export default router;
