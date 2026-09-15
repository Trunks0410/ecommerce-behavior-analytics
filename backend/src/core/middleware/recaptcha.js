export const verifyRecaptcha = async (req, res, next) => {
  // Bỏ qua xác thực reCAPTCHA trong môi trường development
  if (process.env.NODE_ENV !== "production") {
    return next();
  }

  const { recaptchaToken } = req.body;

  if (!recaptchaToken) {
    return res.status(400).json({ message: "Vui lòng xác thực reCAPTCHA" });
  }

  try {
    const secretKey = process.env.RECAPTCHA_SECRET_KEY;
    const response = await fetch(
      `https://www.google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${recaptchaToken}`,
      {
        method: "POST",
      },
    );

    const data = await response.json();

    if (data.success) {
      next();
    } else {
      console.error("reCAPTCHA failed:", data["error-codes"]);
      res.status(400).json({
        message: "Xác thực reCAPTCHA thất bại",
        errors: data["error-codes"],
      });
    }
  } catch (err) {
    console.error("reCAPTCHA error:", err);
    res.status(500).json({ message: "Lỗi server khi xác thực reCAPTCHA" });
  }
};
