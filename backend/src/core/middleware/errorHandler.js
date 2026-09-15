export const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal server error";

  // In production, we don't send the stack trace
  const isDevelopment = process.env.NODE_ENV === "development";

  console.error(`[Error] ${statusCode} - ${message}`);
  if (isDevelopment && err.stack) {
    console.error(err.stack);
  }

  res.status(statusCode).json({
    message: isDevelopment ? message : "Đã có lỗi xảy ra trên hệ thống.",
    stack: isDevelopment ? err.stack : undefined,
  });
};
