import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import db from '../../database/models/index.js';
import { sendForgotPasswordOtp, sendOtpSecurityAlert } from '../../core/utils/emailService.js';

// ─── Constants ────────────────────────────────────────────────────────────────
const OTP_EXPIRY_MINUTES = 5;
const OTP_MAX_ATTEMPTS = 3;
const OTP_LOCK_MINUTES = 15;
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_POLICY_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^()_+=\-])[A-Za-z\d@$!%*?&#^()_+=\-]{8,}$/;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const generateOtpCode = () => {
  return crypto.randomInt(100000, 999999).toString();
};

const isValidPassword = (password) => {
  return PASSWORD_POLICY_REGEX.test(password);
};

// ─── Service Methods ──────────────────────────────────────────────────────────

const sendOtp = (email) => {
  return new Promise(async (resolve, reject) => {
    try {
      // 5a. Kiểm tra email tồn tại
      const user = await db.User.findOne({ where: { email } });
      if (!user) {
        return resolve({ status: 404, message: 'Email does not exist.' });
      }

      // Xoá OTP cũ chưa dùng
      await db.OtpVerification.destroy({
        where: { user_id: user.id, type: 'PASSWORD_RECOVERY', is_used: false },
      });

      // Tạo OTP mới
      const otpCode = generateOtpCode();
      const expiredAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

      await db.OtpVerification.create({
        user_id: user.id,
        otp_code: otpCode,
        type: 'PASSWORD_RECOVERY',
        expired_at: expiredAt,
        attempts: 0,
        is_used: false,
        locked_until: null,
      });

      // Gửi mail (fire-and-forget)
      sendForgotPasswordOtp(email, otpCode).catch((err) =>
        console.error('[emailService] Failed to send OTP email:', err)
      );

      return resolve({
        status: 200,
        message: 'OTP has been sent to your email. Please check your inbox.',
      });
    } catch (error) {
      reject(error);
    }
  });
};

const verifyOtp = (email, otpCode) => {
  return new Promise(async (resolve, reject) => {
    try {
      const user = await db.User.findOne({ where: { email } });
      if (!user) {
        return resolve({ status: 404, message: 'Email does not exist.' });
      }

      const otpRecord = await db.OtpVerification.findOne({
        where: { user_id: user.id, type: 'PASSWORD_RECOVERY', is_used: false },
        order: [['created_at', 'DESC']],
      });

      if (!otpRecord) {
        return resolve({
          status: 400,
          message: 'No active OTP found. Please request a new OTP.',
        });
      }

      // 10d. Kiểm tra khoá tạm thời
      if (otpRecord.locked_until && new Date() < new Date(otpRecord.locked_until)) {
        const remainingMs = new Date(otpRecord.locked_until) - new Date();
        const remainingMin = Math.ceil(remainingMs / 60000);
        return resolve({
          status: 423,
          message: `OTP is temporarily locked due to too many failed attempts. Please try again in ${remainingMin} minute(s).`,
        });
      }

      // 9b. Kiểm tra hết hạn
      if (new Date() > new Date(otpRecord.expired_at)) {
        return resolve({
          status: 410,
          message: 'OTP expired. Please request a new OTP.',
        });
      }

      // So sánh OTP
      if (otpRecord.otp_code !== otpCode) {
        const newAttempts = otpRecord.attempts + 1;

        if (newAttempts >= OTP_MAX_ATTEMPTS) {
          // 9d. Khoá và gửi mail cảnh báo
          const lockedUntil = new Date(Date.now() + OTP_LOCK_MINUTES * 60 * 1000);
          await otpRecord.update({ attempts: newAttempts, locked_until: lockedUntil });

          sendOtpSecurityAlert(email).catch((err) =>
            console.error('[emailService] Failed to send security alert:', err)
          );

          return resolve({
            status: 423,
            message: `Invalid OTP. You have exceeded the maximum attempts. OTP is locked for ${OTP_LOCK_MINUTES} minutes. A security alert has been sent to your email.`,
          });
        }

        await otpRecord.update({ attempts: newAttempts });
        const attemptsLeft = OTP_MAX_ATTEMPTS - newAttempts;
        return resolve({
          status: 400,
          message: `Invalid OTP. You have ${attemptsLeft} attempt(s) remaining.`,
        });
      }

      // OTP hợp lệ
      await otpRecord.update({ is_used: true });

      // Tạo reset_token (10 phút)
      const resetPayload = `${user.id}:${Date.now()}`;
      const resetSecret = process.env.RESET_TOKEN_SECRET || 'reset_secret_fallback';
      const hmac = crypto.createHmac('sha256', resetSecret);
      hmac.update(resetPayload);
      const signature = hmac.digest('hex');
      const resetToken = Buffer.from(`${resetPayload}:${signature}`).toString('base64url');

      return resolve({
        status: 200,
        message: 'OTP verified successfully.',
        data: { reset_token: resetToken },
      });
    } catch (error) {
      reject(error);
    }
  });
};

const resetPassword = (resetToken, newPassword, confirmPassword) => {
  return new Promise(async (resolve, reject) => {
    try {
      // Giải mã reset_token
      let userId, issuedAt;
      try {
        const decoded = Buffer.from(resetToken, 'base64url').toString('utf8');
        const parts = decoded.split(':');
        if (parts.length !== 3) throw new Error('Malformed token');

        const [id, ts, sig] = parts;
        const resetSecret = process.env.RESET_TOKEN_SECRET || 'reset_secret_fallback';
        const hmac = crypto.createHmac('sha256', resetSecret);
        hmac.update(`${id}:${ts}`);
        const expectedSig = hmac.digest('hex');

        if (sig !== expectedSig) throw new Error('Invalid signature');

        userId = parseInt(id);
        issuedAt = parseInt(ts);
      } catch {
        return resolve({ status: 400, message: 'Invalid or tampered reset token.' });
      }

      // Token hết hạn sau 10 phút
      if (Date.now() - issuedAt > 10 * 60 * 1000) {
        return resolve({ status: 410, message: 'Reset token has expired. Please start over.' });
      }

      // 13c. Kiểm tra độ dài
      if (!newPassword || newPassword.length < PASSWORD_MIN_LENGTH) {
        return resolve({
          status: 400,
          message: `Password must be at least ${PASSWORD_MIN_LENGTH} characters long.`,
        });
      }

      // 14c. Kiểm tra policy
      if (!isValidPassword(newPassword)) {
        return resolve({
          status: 400,
          message:
            'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&#^()_+=-). Please re-enter.',
        });
      }

      // Kiểm tra confirm
      if (newPassword !== confirmPassword) {
        return resolve({
          status: 400,
          message: 'Passwords do not match. Please re-enter.',
        });
      }

      const user = await db.User.findByPk(userId);
      if (!user) {
        return resolve({ status: 404, message: 'User not found.' });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await user.update({ password: hashedPassword });

      // Xoá refresh token cũ
      await db.RefreshToken.destroy({ where: { user_id: userId } });

      return resolve({ status: 200, message: 'Password changed successfully.' });
    } catch (error) {
      reject(error);
    }
  });
};

const resendOtp = (email) => {
  return sendOtp(email);
};

export default { sendOtp, verifyOtp, resetPassword, resendOtp };