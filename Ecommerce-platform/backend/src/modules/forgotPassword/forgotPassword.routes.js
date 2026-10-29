import express from 'express';
import rateLimit from 'express-rate-limit';
import forgotPasswordController from './forgotPassword.controller.js';

const router = express.Router();

// ─── Rate Limiters ─────────────────────────────────────────────────────────────

const sendOtpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 429,
    message: 'Too many OTP requests. Please try again after 15 minutes.',
  },
});

const verifyOtpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 429,
    message: 'Too many verification attempts. Please try again after 15 minutes.',
  },
});

const resetPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 429,
    message: 'Too many reset attempts. Please try again after 15 minutes.',
  },
});

// ─── Routes ────────────────────────────────────────────────────────────────────

router.post('/send-otp', sendOtpLimiter, forgotPasswordController.sendOtp);
router.post('/resend-otp', sendOtpLimiter, forgotPasswordController.resendOtp);
router.post('/verify-otp', verifyOtpLimiter, forgotPasswordController.verifyOtp);
router.post('/reset-password', resetPasswordLimiter, forgotPasswordController.resetPassword);

export default router;