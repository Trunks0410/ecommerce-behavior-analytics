import express from "express";
import orderController from "./order.controller.js";
import shipperController from "../shipper/shipper.controller.js";
import { verifyToken } from "../../core/middleware/auth.js";

const router = express.Router();

router.use(verifyToken);

router.post("/calculate", orderController.calculateCheckout); // Tính toán đơn hàng
router.post("/", orderController.createOrder); // Đặt hàng
router.get("/counts", orderController.getMyOrderCounts); // Đếm số lượng đơn hàng
router.get("/", orderController.getMyOrders); // Lịch sử đơn hàng
router.get("/shipper/cod/collected", shipperController.getCollectedCOD); // COD thu hộ chưa đối soát
router.post("/shipper/cod/reconcile", shipperController.submitCODReconciliation); // Gửi đối soát COD
router.get("/shipper/cod/reconciliations", shipperController.getReconciliationHistory); // Lịch sử đối soát COD
router.get("/shipper", orderController.getShipperOrders); // Shipper orders
router.get("/:id", orderController.getOrderDetail); // Chi tiết đơn hàng
router.post("/:id/cancel", orderController.cancelOrder); // Hủy đơn hàng
router.patch("/bulk-status", orderController.bulkUpdateOrderStatus); // Cập nhật trạng thái hàng loạt
router.patch("/:orderId/status", orderController.updateOrderStatus); // Cập nhật trạng thái

export default router;
