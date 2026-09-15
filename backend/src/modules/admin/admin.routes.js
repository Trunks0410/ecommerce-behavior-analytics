import express from "express";
import adminController from "./admin.controller.js";
import { verifyToken, isManager } from "../../core/middleware/auth.js";
import upload from "../../core/middleware/upload.js";

const router = express.Router();

// Tất cả route admin đều cần verifyToken + isManager
router.use(verifyToken, isManager);

// ---- 1. Quản lý Tài khoản (Manager, Customer, Vendor, Shipper) ----
router.post("/users", adminController.createUser);
router.get("/users", adminController.getUsersByRole);
router.put("/users/:id", upload.single("avatar"), adminController.updateUserProfile);
router.put("/users/:id/lock", adminController.lockUser);
router.put("/users/:id/unlock", adminController.unlockUser);

// ---- 2. Phê duyệt Vendor ----
router.get("/shops", adminController.getAllShops);
router.get("/shops/pending", adminController.getPendingShops);
router.put("/shops/:id/approve", adminController.approveShop);
router.put("/shops/:id/reject", adminController.rejectShop);

// ---- 3. Cấu hình hệ thống ----
router.get("/settings", adminController.getSystemSettings);
router.put("/settings/:key", adminController.updateSystemSetting);
router.get("/categories", adminController.getCategories);
router.post("/categories", adminController.createCategory);
router.put("/categories/:id", adminController.updateCategory);
router.delete("/categories/:id", adminController.deleteCategory);

// ---- 4. Báo cáo tài chính ----
router.get("/financial-report", adminController.getFinancialReport);

// ---- 5. Đối soát thanh toán ----
router.get("/reconciliation", adminController.getPaymentReconciliation);
router.put("/payouts/:id/approve", adminController.approveShopPayout);
router.put("/payouts/:id/reject", adminController.rejectShopPayout);
router.get("/shipper-reconciliations", adminController.getPendingShipperReconciliations);
router.put("/shipper-reconciliations/:id/approve", adminController.approveShipperReconciliation);
router.put("/shipper-reconciliations/:id/reject", adminController.rejectShipperReconciliation);
router.get("/shop-wallets", adminController.getShopWalletBreakdown);
router.post("/shop-wallets/:id/disburse", adminController.disburseShopWallet);


// ---- 6. Lịch sử thanh toán ----
router.get("/payment-logs", adminController.getPaymentLogs);
router.get("/withdrawal-logs", adminController.getWithdrawalLogs);
router.get("/orders/by-code/:code", adminController.getOrderByCode);

// ---- 7. Nhật ký hệ thống ----
router.get("/activity-logs", adminController.getActivityLogs);

export default router;
