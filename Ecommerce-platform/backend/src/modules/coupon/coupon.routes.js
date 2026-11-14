import express from "express";
import couponController from "./coupon.controller.js";
import { optionalVerifyToken, verifyToken } from "../../core/middleware/auth.js"; 

const router = express.Router();

router.get("/valid", optionalVerifyToken, couponController.getValidCoupons);
router.post("/save", verifyToken, couponController.saveCoupon);
router.post("/save-by-code", verifyToken, couponController.saveCouponByCode);
router.delete("/save/:couponId", verifyToken, couponController.unsaveCoupon);
router.get("/my-saved", verifyToken, couponController.getMySavedCoupons);
router.get("/my-wallet", verifyToken, couponController.getMyVoucherWallet);

export default router;
