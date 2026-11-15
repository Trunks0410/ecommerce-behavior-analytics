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

      // Fallback dev admin khi Main Backend chưa bật
      if (
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
