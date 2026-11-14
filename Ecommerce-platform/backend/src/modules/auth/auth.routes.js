import express from "express";
const router = express.Router();
import rateLimit from "express-rate-limit";
import authController from "./auth.controller.js";
import { verifyRecaptcha } from "../../core/middleware/recaptcha.js";

const authLimiter = rateLimit({
  windowMs: 1000 * 60 * 5,
  max: 1000000,
  handler: (req, res, next, options) => {
    res.status(options.statusCode).json({
      message: "Bạn đã nhập sai quá nhiều lần. Vui lòng thử lại sau 5 phút."
    });
  },
});

router.post("/register", verifyRecaptcha, authController.register);
router.post("/verify-otp", authController.verifyOTP);
router.post("/login", authLimiter, authController.login);
router.post("/refresh", authController.refresh);
router.post("/logout", authController.logout);
router.post("/google", authController.googleLogin);

export default router;
