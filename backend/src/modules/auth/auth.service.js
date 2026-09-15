import bcrypt from "bcryptjs";
import axios from "axios";
import { OAuth2Client } from "google-auth-library";
import crypto from "crypto";
import { generateAccessToken, generateRefreshToken } from "../../core/utils/jwt.js";
import db from "../../database/models/index.js";
import { sendRegistrationOtp } from "../../core/utils/emailService.js";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const pendingRegistrations = new Map();

const register = (data) => {
  return new Promise(async (resolve, reject) => {
    try {
      const { email, phone, password, fullName, role_id } = data;

      // Check if user already exists (including soft-deleted)
      const existingUser = await db.User.findOne({
        where: {
          [db.Sequelize.Op.or]: [{ email }, { phone }],
        },
        paranoid: false,
      });

      if (existingUser) {
        if (existingUser.deleted_at) {
          return resolve({
            status: 409,
            message: "Tài khoản với email hoặc số điện thoại này đã bị xóa. Vui lòng liên hệ quản trị viên để khôi phục.",
          });
        }
        return resolve({
          status: 409,
          message: "User with this email or phone already exists",
        });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Generate OTP for account activation
      const otpCode = crypto.randomInt(100000, 999999).toString();
      const expiredAt = Date.now() + 15 * 60 * 1000; // 15 minutes

      console.log(`Generating OTP for ${email}: ${otpCode}`);

      // Save pending registration to memory
      pendingRegistrations.set(email, {
        email,
        phone,
        password: hashedPassword,
        fullName,
        role_id: role_id || 5, // Default to user role (5)
        otpCode,
        expiredAt,
      });

      // Send OTP email
      console.log(`Sending registration OTP to ${email}...`);
      sendRegistrationOtp(email, otpCode)
        .then(() => console.log(`OTP email sent successfully to ${email}`))
        .catch((err) =>
          console.error(`Failed to send registration OTP to ${email}:`, err),
        );

      resolve({
        status: 201,
        message: "User registered successfully. Please check your email for OTP.",
        data: { email }, // Cannot return user.id yet
      });
    } catch (error) {
      reject(error);
    }
  });
};

const login = (data) => {
  return new Promise(async (resolve, reject) => {
    try {
      const { email_or_phone, password } = data;

      // Find user
      const user = await db.User.findOne({
        where: {
          [db.Sequelize.Op.or]: [
            { email: email_or_phone },
            { phone: email_or_phone },
          ],
        },
        include: [
          {
            model: db.Role,
            as: "role",
          },
          {
            model: db.UserProfile,
            as: "profile",
          },
        ],
      });

      if (!user) {
        return resolve({
          status: 401,
          message: "User not found",
        });
      }

      // Check password
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return resolve({
          status: 401,
          message: "Wrong password",
        });
      }

      // Check user status
      if (user.status !== "ACTIVE") {
        return resolve({
          status: 403,
          message: "Account is not active",
        });
      }

      // Generate tokens
      const accessToken = generateAccessToken({
        id: user.id,
        email: user.email,
        role_id: user.role_id,
      });

      const refreshToken = generateRefreshToken({
        id: user.id,
      });

      // Save refresh token to database
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
      await db.RefreshToken.create({
        user_id: user.id,
        token: refreshToken,
        expires_at: expiresAt,
        is_revoked: false,
      });
      let redirectUrl = "/";
      if (user.role_id === 1 || user.role?.role_name === "admin") {////
        redirectUrl = "/admin";
      }
      resolve({
        status: 200,
        message: "Login success",
        data: {
          accessToken,
          refreshToken,
          redirectUrl,
          user: {
            id: user.id,
            email: user.email,
            phone: user.phone,
            role: user.role?.role_name,
            fullName: user.profile?.full_name || "",
            dateOfBirth: user.profile?.birthday || null,
            address: user.profile?.address || null,
            gender: user.profile?.gender || null,
            avatarUrl: user.profile?.avatar_url || null,
          },
        },
      });
    } catch (error) {
      reject(error);
    }
  });
};

const refreshToken = (token) => {
  return new Promise(async (resolve, reject) => {
    try {
      // Find refresh token in database
      const refreshTokenRecord = await db.RefreshToken.findOne({
        where: {
          token,
          is_revoked: false,
        },
      });

      if (!refreshTokenRecord) {
        return resolve({
          status: 401,
          message: "Invalid refresh token",
        });
      }

      // Check if token is expired
      if (new Date() > new Date(refreshTokenRecord.expires_at)) {
        return resolve({
          status: 401,
          message: "Refresh token expired",
        });
      }

      // Revoke old token
      await refreshTokenRecord.update({ is_revoked: true });

      // Get user
      const user = await db.User.findByPk(refreshTokenRecord.user_id);

      if (!user) {
        return resolve({
          status: 404,
          message: "User not found",
        });
      }

      // Generate new tokens
      const newAccessToken = generateAccessToken({
        id: user.id,
        email: user.email,
        role_id: user.role_id,
      });

      const newRefreshToken = generateRefreshToken({
        id: user.id,
      });

      // Save new refresh token
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
      await db.RefreshToken.create({
        user_id: user.id,
        token: newRefreshToken,
        expires_at: expiresAt,
        is_revoked: false,
      });

      resolve({
        status: 200,
        message: "Token refreshed",
        data: {
          accessToken: newAccessToken,
          refreshToken: newRefreshToken,
        },
      });
    } catch (error) {
      reject(error);
    }
  });
};

const googleLogin = (accessTokenFromGoogle) => {
  return new Promise(async (resolve, reject) => {
    try {
      // Dùng accessToken truy vấn Google lấy User Info
      const { data: payload } = await axios.get(
        "https://www.googleapis.com/oauth2/v3/userinfo",
        {
          headers: { Authorization: `Bearer ${accessTokenFromGoogle}` },
        },
      );

      const { email, sub, given_name, family_name, picture } = payload;

      let user = await db.User.findOne({
        where: { email },
        include: [
          {
            model: db.Role,
            as: "role",
          },
        ],
      });

      if (user) {
        // Sync provider if user is local or doesn't have provider
        if (!user.auth_provider || user.auth_provider === "local") {
          await user.update({
            auth_provider: "google",
            auth_provider_id: sub,
          });
        }

        // Cập nhật avatar nếu chưa có
        const profile = await db.UserProfile.findOne({
          where: { user_id: user.id },
        });
        if (profile && !profile.avatar_url) {
          await profile.update({ avatar_url: picture });
        }
      } else {
        // Create new user
        user = await db.User.create({
          email,
          auth_provider: "google",
          auth_provider_id: sub,
          status: "ACTIVE",
          role_id: 5, // Default user role
        });

        await db.UserProfile.create({
          user_id: user.id,
          full_name: `${given_name} ${family_name}`.trim(),
          avatar_url: picture,
        });

        // reload user with role
        user = await db.User.findByPk(user.id, {
          include: [
            {
              model: db.Role,
              as: "role",
            },
          ],
        });
      }

      if (user.status !== "ACTIVE") {
        return resolve({
          status: 403,
          message: "Account is not active",
        });
      }

      // Generate tokens
      const accessToken = generateAccessToken({
        id: user.id,
        email: user.email,
        role_id: user.role_id,
      });

      const refreshToken = generateRefreshToken({
        id: user.id,
      });

      // Save refresh token to database
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
      await db.RefreshToken.create({
        user_id: user.id,
        token: refreshToken,
        expires_at: expiresAt,
        is_revoked: false,
      });

      let redirectUrl = "/";
      if (user.role_id === 1 || user.role?.role_name === "admin" || user.role?.role_name === "manager") {
        redirectUrl = "/admin";
      }

      resolve({
        status: 200,
        message: "Google login success",
        data: {
          accessToken,
          refreshToken,
          redirectUrl,
          user: {
            id: user.id,
            email: user.email,
            phone: user.phone || "",
            role: user.role?.role_name,
          },
        },
      });
    } catch (error) {
      console.error("Google Login Error:", error);
      reject(error);
    }
  });
};

const verifyAccountOtp = (data) => {
  return new Promise(async (resolve, reject) => {
    try {
      const { email, otpCode } = data;

      const pendingUser = pendingRegistrations.get(email);
      if (!pendingUser) {
        return resolve({ status: 404, message: "User not found or registration expired" });
      }

      if (pendingUser.otpCode !== otpCode) {
        return resolve({ status: 400, message: "Invalid OTP code" });
      }

      if (Date.now() > pendingUser.expiredAt) {
        pendingRegistrations.delete(email);
        return resolve({ status: 410, message: "OTP code expired" });
      }

      // Create user
      const user = await db.User.create({
        email: pendingUser.email,
        phone: pendingUser.phone,
        password: pendingUser.password,
        role_id: pendingUser.role_id,
        status: "ACTIVE",
      });

      // Create profile
      await db.UserProfile.create({
        user_id: user.id,
        full_name: pendingUser.fullName,
      });

      pendingRegistrations.delete(email);

      resolve({
        status: 200,
        message: "Account verified and created successfully",
      });
    } catch (error) {
      reject(error);
    }
  });
};

export default {
  register,
  login,
  refreshToken,
  googleLogin,
  verifyAccountOtp,
};
