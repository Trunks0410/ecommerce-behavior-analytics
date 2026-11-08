import "dotenv/config";
import { isLogSilenced } from "../utils/logContext.js";

const shouldLogSql = process.env.DB_LOGGING !== "false";

const dbConfig = {
  username: process.env.DB_USER || "admin",
  password: process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : "",
  database: process.env.DB_NAME || "ecommerce_platform",
  host: process.env.DB_HOST || "database-1.c3oq6oqssh7j.ap-southeast-2.rds.amazonaws.com",
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
  dialect: process.env.DB_DIALECT || "mysql",
  benchmark: true,
  logging: shouldLogSql
    ? (sql, timingMs) => {
        // Lọc bỏ các query kiểm tra metadata/schema nội bộ gây nhiễu log
        if (
          sql.includes("INFORMATION_SCHEMA") ||
          sql.includes("SHOW INDEX") ||
          sql.includes("SHOW TABLES") ||
          sql.includes("SELECT 1+1") ||
          isLogSilenced() // Query phát sinh từ route polling (vd: /chats/unread-count)
        ) {
          return;
        }
        const timeStr = typeof timingMs === "number" ? ` \x1b[33m(${timingMs}ms)\x1b[0m` : "";
        console.log(`\x1b[36m🗄️  [DB SQL]\x1b[0m ${sql}${timeStr}`);
      }
    : false,
  dialectOptions: {
    multipleStatements: true,
  },
  timezone: process.env.DB_TIMEZONE || "+07:00",
};

const config = {
  development: dbConfig,
  test: dbConfig,
  production: dbConfig,
  ...dbConfig,
};

export default config;
