import authService from "./auth.service.js";

//REGISTER
const register = async (req, res) => {
  try {
    const { email, phone, password, fullName, role_id } = req.body;

    if (!email || !phone || !password) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const response = await authService.register({
      email,
      phone,
      password,
      fullName,
      role_id,
    });

    return res.status(response.status).json(response);
  } catch (error) {
    console.error("Register Error:", error);
    return res.status(500).json({
      message: "Internal server error: " + error.message,
      stack: error.stack,
    });
  }
};

// LOGIN
const login = async (req, res) => {
  try {
    const { email_or_phone, password } = req.body;

    if (!email_or_phone || !password) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const response = await authService.login({
      email_or_phone,
      password,
    });

    // Thêm thông báo tiếng Việt và đếm số lần sai từ nhánh di
    if (response.status !== 200) {
      const maxAttempts = req.rateLimit?.limit || 6;
      const currentAttempts = req.rateLimit?.current || 1;

      let vietnameseMessage = response.message;
      if (response.message === "User not found")
        vietnameseMessage = "Không tìm thấy người dùng";
      if (response.message === "Wrong password")
        vietnameseMessage = "Sai mật khẩu";

      response.message = `${vietnameseMessage}. Bạn đã nhập sai ${currentAttempts}/${maxAttempts} lần. Quá ${maxAttempts} lần sẽ bị khóa đăng nhập 5 phút.`;
    }

    // Lưu refreshToken vào cookie httpOnly từ HEAD
    if (response.status === 200 && response.data?.refreshToken) {
      res.cookie("refreshToken", response.data.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });
      delete response.data.refreshToken;
    }

    return res.status(response.status).json(response);
  } catch (error) {
    console.error("Login Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// REFRESH TOKEN
const refresh = async (req, res) => {
  try {
    const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

    if (!refreshToken) {
      return res.status(400).json({ message: "Refresh token is required" });
    }

    const response = await authService.refreshToken(refreshToken);

    return res.status(response.status).json(response);
  } catch (error) {
    console.error("Refresh Token Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// LOGOUT
const logout = async (req, res) => {
  try {
    res.clearCookie("refreshToken");
    return res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    console.error("Logout Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// GOOGLE LOGIN (từ nhánh di)
const googleLogin = async (req, res) => {
  try {
    const { googleAccessToken } = req.body;

    if (!googleAccessToken) {
      return res.status(400).json({ message: "Missing Google Access Token" });
    }

    const response = await authService.googleLogin(googleAccessToken);

    // Lưu refreshToken vào cookie httpOnly tương tự như login thường
    if (response.status === 200 && response.data?.refreshToken) {
      res.cookie("refreshToken", response.data.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });
      delete response.data.refreshToken;
    }

    return res.status(response.status).json(response);
  } catch (error) {
    console.error("Google Login Controller Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// VERIFY OTP
const verifyOTP = async (req, res) => {
  try {
    const { email, otpCode } = req.body;

    if (!email || !otpCode) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const response = await authService.verifyAccountOtp({ email, otpCode });

    return res.status(response.status).json(response);
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

export default {
  register,
  login,
  refresh,
  logout,
  googleLogin,
  verifyOTP,
};
