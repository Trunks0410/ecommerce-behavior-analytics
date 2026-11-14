export const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal server error";
  const isProduction = process.env.NODE_ENV === "production";

  console.error(`\n🚨 [API ERROR] ${req.method} ${req.originalUrl} - Status: ${statusCode}`);
  console.error(`   Message: ${message}`);

  // Chi tiết lỗi từ Sequelize Database
  if (err.name && err.name.includes("Sequelize")) {
    console.error(`   🔴 [Sequelize Error Type]: ${err.name}`);
    if (err.sql) {
      console.error(`   📝 [Failed SQL Query]:\n      ${err.sql}`);
    }
    if (err.original) {
      console.error(`   💥 [MySQL Original Error]: ${err.original.sqlMessage || err.original.message} (Code: ${err.original.code || err.original.errno})`);
    }
    if (err.errors && Array.isArray(err.errors)) {
      err.errors.forEach((e) => {
        console.error(`   ⚠️  Validation: [${e.path}] ${e.message}`);
      });
    }
  }

  // In stack trace khi không phải production
  if (!isProduction && err.stack) {
    console.error(`   📚 [Stack Trace]:\n${err.stack}`);
  }

  res.status(statusCode).json({
    message: isProduction ? "Đã có lỗi xảy ra trên hệ thống." : message,
    errorType: !isProduction ? err.name : undefined,
    sqlMessage: !isProduction && err.original ? (err.original.sqlMessage || err.original.message) : undefined,
    failedSql: !isProduction && err.sql ? err.sql : undefined,
    stack: !isProduction ? err.stack : undefined,
  });
};
