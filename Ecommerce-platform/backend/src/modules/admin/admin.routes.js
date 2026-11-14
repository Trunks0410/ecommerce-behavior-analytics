import express from "express";
import adminController from "./admin.controller.js";
import iamRouter from "../iam/iam.routes.js";
import { verifyToken, requirePermission } from "../../core/middleware/auth.js";
import upload from "../../core/middleware/upload.js";

const router = express.Router();

// Tất cả route admin đều cần xác thực đăng nhập
router.use(verifyToken);

// ---- 0. Phân hệ Quản trị IAM Roles & Policies (Chỉ dành riêng cho Root Admin) ----
router.use("/iam", iamRouter);

// ---- 1. Quản lý Tài khoản (Manager/Staff, Customer, Vendor, Shipper) ----
router.post("/users", requirePermission("user:create"), adminController.createUser);
router.get("/users", requirePermission("user:read"), adminController.getUsersByRole);
router.put("/users/:id", requirePermission("user:update"), upload.single("avatar"), adminController.updateUserProfile);
router.put("/users/:id/lock", requirePermission("user:lock"), adminController.lockUser);
router.put("/users/:id/unlock", requirePermission("user:unlock"), adminController.unlockUser);

// ---- 2. Phê duyệt Vendor ----
router.get("/shops", requirePermission("shop:read"), adminController.getAllShops);
router.get("/shops/pending", requirePermission("shop:read"), adminController.getPendingShops);
router.put("/shops/:id/approve", requirePermission("shop:approve"), adminController.approveShop);
router.put("/shops/:id/reject", requirePermission("shop:reject"), adminController.rejectShop);

// ---- 3. Cấu hình hệ thống & Danh mục ----
router.get("/settings", requirePermission("system:settings:read"), adminController.getSystemSettings);
router.put("/settings/:key", requirePermission("system:settings:update"), adminController.updateSystemSetting);
router.get("/categories", adminController.getCategories);
router.post("/categories", requirePermission("category:create"), adminController.createCategory);
router.put("/categories/:id", requirePermission("category:update"), adminController.updateCategory);
router.delete("/categories/:id", requirePermission("category:delete"), adminController.deleteCategory);

// ---- 4. Báo cáo tài chính ----
router.get("/financial-report", requirePermission("finance:report:read"), adminController.getFinancialReport);

// ---- 5. Đối soát thanh toán & Giải ngân ví ----
router.get("/reconciliation", requirePermission("finance:reconciliation:read"), adminController.getPaymentReconciliation);
router.put("/payouts/:id/approve", requirePermission("finance:payout:approve"), adminController.approveShopPayout);
router.put("/payouts/:id/reject", requirePermission("finance:payout:reject"), adminController.rejectShopPayout);
router.get("/shipper-reconciliations", requirePermission("finance:shipper_reconciliation:approve"), adminController.getPendingShipperReconciliations);
router.put("/shipper-reconciliations/:id/approve", requirePermission("finance:shipper_reconciliation:approve"), adminController.approveShipperReconciliation);
router.put("/shipper-reconciliations/:id/reject", requirePermission("finance:shipper_reconciliation:reject"), adminController.rejectShipperReconciliation);
router.get("/shop-wallets", requirePermission("finance:disburse"), adminController.getShopWalletBreakdown);
router.post("/shop-wallets/:id/disburse", requirePermission("finance:disburse"), adminController.disburseShopWallet);

// ---- 6. Lịch sử thanh toán & Đơn hàng ----
router.get("/payment-logs", requirePermission("finance:logs:read"), adminController.getPaymentLogs);
router.get("/withdrawal-logs", requirePermission("finance:logs:read"), adminController.getWithdrawalLogs);
router.get("/orders/by-code/:code", requirePermission("order:read"), adminController.getOrderByCode);

// ---- 7. Nhật ký hệ thống ----
router.get("/activity-logs", requirePermission("system:settings:read"), adminController.getActivityLogs);

export default router;
