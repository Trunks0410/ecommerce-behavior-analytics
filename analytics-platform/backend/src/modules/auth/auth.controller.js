import axios from "axios";

export const login = async (req, res) => {
  try {
    const { email_or_phone, password } = req.body;
    const mainBackendUrl = (process.env.MAIN_BACKEND_URL || "http://localhost:8080").replace(/\/+$/, "");

    if (!email_or_phone || !password) {
      return res.status(400).json({ message: "Vui lòng nhập đầy đủ email/số điện thoại và mật khẩu" });
    }

    try {
      const response = await axios.post(
        `${mainBackendUrl}/auth/login`,
        { email_or_phone, password },
        { timeout: 10000 }
      );
      return res.status(response.status).json(response.data);
    } catch (apiError) {
      if (apiError.response) {
        return res.status(apiError.response.status).json(apiError.response.data);
      }

      // Chỉ cho phép fallback dev khi cấu hình rõ ALLOW_DEV_ADMIN_FALLBACK=true ngoài production
      if (
        process.env.NODE_ENV !== "production" &&
        process.env.ALLOW_DEV_ADMIN_FALLBACK === "true" &&
        (email_or_phone === "admin@meemart.com" || email_or_phone === "admin@gmail.com") &&
        (password === "admin123" || password === "123456")
      ) {
        return res.status(200).json({
          status: 200,
          message: "Đăng nhập thành công (Analytics Development Mode)",
          data: {
            accessToken: "dev_analytics_admin_token_" + Date.now(),
            user: {
              id: 1,
              email: email_or_phone,
              fullName: "Platform Super Admin",
              role: "admin",
            },
          },
        });
      }

      return res.status(503).json({
        message: `Không thể kết nối đến Auth Service chính (${mainBackendUrl}): ${apiError.message}`,
      });
    }
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const verify = async (req, res) => {
  try {
    const authHeader = req.headers.authorization || "";
    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Thiếu token xác thực" });
    }
    const token = authHeader.slice(7).trim();
    if (!token) {
      return res.status(401).json({ message: "Token không hợp lệ" });
    }

    const mainBackendUrl = (process.env.MAIN_BACKEND_URL || "http://localhost:8080").replace(/\/+$/, "");
    const response = await axios.get(`${mainBackendUrl}/user/profile`, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 10000,
    });

    const user = response.data?.data || response.data?.user || response.data;
    const roleName =
      typeof user?.role === "string"
        ? user.role.toLowerCase()
        : user?.role?.role_name?.toLowerCase();

    if (roleName !== "admin" && user?.role_id !== 1) {
      return res.status(403).json({ message: "Tài khoản không có quyền Quản trị viên (Admin)" });
    }

    return res.status(200).json({
      status: 200,
      message: "Token hợp lệ",
      data: {
        user: {
          id: user.id,
          email: user.email,
          fullName: user.profile?.full_name || user.fullName || "Admin",
          role: "admin",
        },
      },
    });
  } catch (error) {
    if (error.response) {
      return res.status(error.response.status === 403 ? 403 : 401).json({
        message: error.response.data?.message || "Phiên đăng nhập không hợp lệ hoặc đã hết hạn",
      });
    }
    return res.status(503).json({ message: "Không thể xác thực token với hệ thống chính" });
  }
};

export const ssoExchange = async (req, res) => {
  try {
    const { code } = req.body || {};
    if (!code) {
      return res.status(400).json({ message: "Thiếu mã SSO" });
    }
    const mainBackendUrl = (process.env.MAIN_BACKEND_URL || "http://localhost:8080").replace(/\/+$/, "");
    const response = await axios.post(
      `${mainBackendUrl}/auth/sso-exchange`,
      { code },
      { timeout: 10000 }
    );
    return res.status(response.status).json(response.data);
  } catch (error) {
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    return res.status(503).json({ message: "Không thể đổi mã SSO với hệ thống chính" });
  }
};
