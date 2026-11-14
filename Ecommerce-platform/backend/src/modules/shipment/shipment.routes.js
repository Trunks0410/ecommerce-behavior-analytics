import express from "express";
import { verifyToken } from "../../core/middleware/auth.js";
import shipmentController from "./shipment.controller.js";

const router = express.Router();

router.use(verifyToken);
router.get("/order/:orderId", shipmentController.getShipmentByOrder);

export default router;
