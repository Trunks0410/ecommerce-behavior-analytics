import express from "express";
import managerController from "./manager.controller.js";
import { verifyToken, isManager } from "../../core/middleware/auth.js";

const router = express.Router();

// Apply auth middleware to all manager routes
router.use(verifyToken, isManager);

router.get("/stats", managerController.getStats);
router.get("/reports/overview", managerController.getReportOverview);

router.get("/products/pending", managerController.getPendingProducts);
router.get("/products/active", managerController.getActiveProducts);
router.put("/products/:id/status", managerController.updateProductStatus);

router.get("/disputes", managerController.getDisputes);
router.put("/disputes/:id/resolve", managerController.resolveDispute);

router.get("/vouchers", managerController.getVouchers);
router.post("/vouchers", managerController.createVoucher);
router.delete("/vouchers/:id", managerController.deleteVoucher);

router.get("/campaigns", managerController.getCampaigns);
router.post("/campaigns", managerController.createCampaign);

router.get("/vendors", managerController.getVendors);
router.put("/vendors/:id/status", managerController.updateVendorStatus);

router.get("/returns", managerController.getReturnRequests);
router.get("/returns/:id", managerController.getReturnRequestDetail);
router.post("/returns/:id/resolve", managerController.resolveReturnRequest);

export default router;
