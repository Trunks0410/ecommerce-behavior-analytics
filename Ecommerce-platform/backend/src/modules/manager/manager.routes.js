import express from "express";
import managerController from "./manager.controller.js";
import { verifyToken, requirePermission } from "../../core/middleware/auth.js";

const router = express.Router();

// Tất cả route vận hành đều cần verifyToken và kiểm tra IAM permission tương ứng
router.use(verifyToken);

router.get("/stats", requirePermission("stats:read"), managerController.getStats);
router.get("/reports/overview", requirePermission("reports:read"), managerController.getReportOverview);

router.get("/products/pending", requirePermission("product:read"), managerController.getPendingProducts);
router.get("/products/active", requirePermission("product:read"), managerController.getActiveProducts);
router.put("/products/:id/status", requirePermission("product:approve"), managerController.updateProductStatus);

router.get("/disputes", requirePermission("dispute:read"), managerController.getDisputes);
router.put("/disputes/:id/resolve", requirePermission("dispute:resolve"), managerController.resolveDispute);

router.get("/vouchers", requirePermission("voucher:read"), managerController.getVouchers);
router.post("/vouchers", requirePermission("voucher:manage"), managerController.createVoucher);
router.delete("/vouchers/:id", requirePermission("voucher:manage"), managerController.deleteVoucher);

router.get("/campaigns", requirePermission("campaign:read"), managerController.getCampaigns);
router.post("/campaigns", requirePermission("campaign:manage"), managerController.createCampaign);

router.get("/vendors", requirePermission("shop:read"), managerController.getVendors);
router.put("/vendors/:id/status", requirePermission("shop:update"), managerController.updateVendorStatus);

router.get("/returns", requirePermission("return:read"), managerController.getReturnRequests);
router.get("/returns/:id", requirePermission("return:read"), managerController.getReturnRequestDetail);
router.post("/returns/:id/resolve", requirePermission("return:resolve"), managerController.resolveReturnRequest);

export default router;
