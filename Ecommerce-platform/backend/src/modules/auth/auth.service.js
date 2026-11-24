import bcrypt from "bcryptjs";
import axios from "axios";
import { OAuth2Client } from "google-auth-library";
import crypto from "crypto";
import { generateAccessToken, generateRefreshToken } from "../../core/utils/jwt.js";
import db from "../../database/models/index.js";
import { sendRegistrationOtp } from "../../core/utils/emailService.js";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const pendingRegistrations = new Map();
const ssoExchangeCodes = new Map();

const revokeRefreshToken = async (token) => {
  if (!token) return false;
  const [updatedCount] = await db.RefreshToken.update(
    { is_revoked: true },
    { where: { token, is_revoked: false } }
  );
  return updatedCount > 0;
};

const issueSsoCode = (user, accessToken) => {
  const roleName =
    typeof user?.role === "string"
      ? user.role.toLowerCase()
      : user?.role?.role_name?.toLowerCase();
  if (roleName !== "admin" && user?.role_id !== 1) {
    return { status: 403, message: "Chỉ Quản trị viên mới được cấp mã SSO Analytics" };
  }
  const now = Date.now();
  for (const [k, v] of ssoExchangeCodes.entries()) {
    if (v.expiresAt < now) ssoExchangeCodes.delete(k);
  }
  const code = crypto.randomBytes(32).toString("hex");
  ssoExchangeCodes.set(code, {
    accessToken,
    user: {
      id: user.id,
      email: user.email,
      fullName: user.profile?.full_name || user.fullName || "Admin",
      role: "admin",
    },
    expiresAt: now + 30 * 1000,
  });
  return { status: 200, data: { code } };
};

const exchangeSsoCode = (code) => {
  if (!code || typeof code !== "string") {
    return { status: 400, message: "Thiếu mã SSO" };
  }
  const record = ssoExchangeCodes.get(code);
  ssoExchangeCodes.delete(code); // Dùng 1 lần duy nhất
  if (!record || record.expiresAt < Date.now()) {
    return { status: 401, message: "Mã SSO không hợp lệ hoặc đã hết hạn" };
  }
  return {
    status: 200,
    message: "SSO exchange thành công",
    data: {
      accessToken: record.accessToken,
      user: record.user,
    },
  };
};

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
      console.log(`\n🔍 [AUTH SERVICE] Querying database for user: "${email_or_phone}"...`);

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
        console.warn(`❌ [AUTH SERVICE] No user found with email or phone: "${email_or_phone}"`);
        return resolve({
          status: 401,
          message: "User not found",
        });
      }

      console.log(`👤 [AUTH SERVICE] Found user ID ${user.id} (${user.email}) - Status: ${user.status}, Role: ${user.role?.role_name || user.role_id}`);

      // Check password
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        console.warn(`❌ [AUTH SERVICE] Wrong password for user: "${email_or_phone}"`);
        return resolve({
          status: 401,
          message: "Wrong password",
        });
      }

      // Check user status
      if (user.status !== "ACTIVE") {
        console.warn(`❌ [AUTH SERVICE] Account not active (status: ${user.status}) for user: "${email_or_phone}"`);
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
      console.log(`🔑 [AUTH SERVICE] Creating refresh token in DB for user ID: ${user.id}...`);
      await db.RefreshToken.create({
        user_id: user.id,
        token: refreshToken,
        expires_at: expiresAt,
        is_revoked: false,
      });
      console.log(`🔑 [AUTH SERVICE] Refresh token created successfully.`);

      let redirectUrl = "/";
      if (user.role_id === 1 || user.role?.role_name === "admin") {
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
      console.error(`💥 [AUTH SERVICE ERROR]:`, error);
      if (error.original) {
        console.error(`💥 [SEQUELIZE SQL ERROR]:`, error.original.message);
      }
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
      let payload;
      try {
        const res = await axios.get(
          "https://www.googleapis.com/oauth2/v3/userinfo",
          {
            headers: { Authorization: `Bearer ${accessTokenFromGoogle}` },
            timeout: 10000,
          },
        );
        payload = res.data;
      } catch (googleErr) {
        console.error("❌ [GOOGLE AUTH] Failed to verify Google token:", googleErr.response?.data || googleErr.message);
        return resolve({
          status: 401,
          message: "Token Google không hợp lệ hoặc đã hết hạn. Vui lòng thử đăng nhập lại.",
        });
      }

      const { email, sub, given_name, family_name, name, picture } = payload || {};

      if (!email) {
        return resolve({
          status: 400,
          message: "Không thể lấy địa chỉ email từ tài khoản Google của bạn.",
        });
      }

      const fullNameFromGoogle =
        [given_name, family_name].filter(Boolean).join(" ").trim() ||
        name ||
        email.split("@")[0];

      let user = await db.User.findOne({
        where: { email },
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

      if (user) {
        // Sync provider if user is local or doesn't have provider
        if (!user.auth_provider || user.auth_provider === "local") {
          await user.update({
            auth_provider: "google",
            auth_provider_id: sub,
          });
        }

        // Cập nhật avatar / tên nếu chưa có
        if (user.profile) {
          const updates = {};
          if (!user.profile.avatar_url && picture) updates.avatar_url = picture;
          if (!user.profile.full_name && fullNameFromGoogle) updates.full_name = fullNameFromGoogle;
          if (Object.keys(updates).length > 0) {
            await user.profile.update(updates);
          }
        } else {
          user.profile = await db.UserProfile.create({
            user_id: user.id,
            full_name: fullNameFromGoogle,
            avatar_url: picture || null,
          });
        }
      } else {
        // Tìm role mặc định "user" thay vì hardcode
        const defaultUserRole = await db.Role.findOne({
          where: { role_name: "user" },
        });
        const defaultRoleId = defaultUserRole ? defaultUserRole.id : 5;

        // Tạo mới user & profile
        user = await db.User.create({
          email,
          auth_provider: "google",
          auth_provider_id: sub,
          status: "ACTIVE",
          role_id: defaultRoleId,
        });

        await db.UserProfile.create({
          user_id: user.id,
          full_name: fullNameFromGoogle,
          avatar_url: picture || null,
        });

        // Reload user kèm role và profile
        user = await db.User.findByPk(user.id, {
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
      }

      if (user.status !== "ACTIVE") {
        return resolve({
          status: 403,
          message: "Tài khoản của bạn hiện đang bị khóa hoặc chưa được kích hoạt.",
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
      } else if (user.role?.role_name === "vendor") {
        redirectUrl = "/vendor";
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
            fullName: user.profile?.full_name || fullNameFromGoogle,
            dateOfBirth: user.profile?.birthday || null,
            gender: user.profile?.gender || null,
            avatarUrl: user.profile?.avatar_url || picture || null,
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
  revokeRefreshToken,
  issueSsoCode,
  exchangeSsoCode,
  googleLogin,
  verifyAccountOtp,
};
