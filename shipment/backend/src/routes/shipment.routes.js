import express from "express";
import shipmentController from "../controllers/shipment.controller.js";
import { isAdmin, isShipper, verifyServiceKey, verifyToken } from "../middleware/auth.js";

const router = express.Router();

router.post("/", verifyServiceKey, shipmentController.create);
router.get("/by-reference/:orderReference", verifyServiceKey, shipmentController.getByOrderReference);
router.get("/tracking/:trackingNumber", shipmentController.getTracking);

router.get("/", verifyToken, isAdmin, shipmentController.getShipments);
router.get("/agents", verifyToken, isAdmin, shipmentController.getAgents);
router.get("/:id", verifyToken, shipmentController.getById);

router.post("/:id/accept", verifyToken, isShipper, shipmentController.accept);
router.post("/:id/pickup", verifyToken, isShipper, shipmentController.pickup);
router.post("/:id/start", verifyToken, isShipper, shipmentController.start);
router.post("/:id/out-for-delivery", verifyToken, isShipper, shipmentController.outForDelivery);
router.post("/:id/complete", verifyToken, isShipper, shipmentController.complete);
router.post("/:id/fail", verifyToken, isShipper, shipmentController.fail);

export default router;
