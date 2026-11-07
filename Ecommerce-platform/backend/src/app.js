import "dotenv/config";
import express from "express"; // Restart

import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import cors from "cors";
import { connectDB } from "./core/config/DBConfig.js";
import appRouter from "./app.routes.js";
// Cron jobs moved to worker.js
import morgan from "morgan";
import { errorHandler } from "./core/middleware/errorHandler.js";
import iamService from "./modules/iam/iam.service.js";
import vectorSearchService from "./modules/product/vectorSearch.service.js";

let app = express();
app.use(morgan("dev"));

// Cải thiện xử lý lỗi - exit an toàn để process manager (PM2/Docker) có thể khởi động lại
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Rejection:", reason);
  process.exit(1);
});

// Giới hạn CORS domain cho production
const allowedOrigins = process.env.CORS_ORIGIN 
  ? process.env.CORS_ORIGIN.split(',') 
  : ['http://localhost:5173'];

app.use(cors({ 
  origin: function(origin, callback) {
    // allow requests with no origin (like mobile apps or curl requests)
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }, 
  credentials: true 
}));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());

// Middleware log chi tiết từng API Request & Response & Timing
app.use((req, res, next) => {
  const startTime = Date.now();
  const url = req.originalUrl;

  // Bỏ qua log cho static files
  if (url.startsWith("/public")) {
    return next();
  }

  const timestamp = new Date().toLocaleTimeString("vi-VN");
  console.log(`\n============================================================`);
  console.log(`📡 [API REQ] [${timestamp}] ${req.method} ${url}`);

  if (req.query && Object.keys(req.query).length > 0) {
    console.log(`   🔎 Query:`, JSON.stringify(req.query));
  }

  if (req.body && Object.keys(req.body).length > 0) {
    const safeBody = { ...req.body };
    if (safeBody.password) safeBody.password = "******";
    if (safeBody.refreshToken) safeBody.refreshToken = "[HIDDEN]";
    console.log(`   📦 Body:`, JSON.stringify(safeBody));
  }

  res.on("finish", () => {
    const duration = Date.now() - startTime;
    const isError = res.statusCode >= 400;
    const statusTag = isError
      ? `\x1b[31m[FAIL ${res.statusCode}]\x1b[0m`
      : `\x1b[32m[SUCCESS ${res.statusCode}]\x1b[0m`;

    console.log(`🏁 [API RES] ${req.method} ${url} -> ${statusTag} \x1b[33m(${duration}ms)\x1b[0m`);
    console.log(`============================================================\n`);
  });

  next();
});

// Serve static files
app.use("/public", express.static("src/public"));

app.use(appRouter);

app.get("/brands", (req, res) => {
  return res.status(200).json({
    message: "Success",
    data: [
      { id: 1, name: "Apple" },
      { id: 2, name: "Samsung" },
      { id: 3, name: "Sony" },
      { id: 4, name: "Philips" },
      { id: 5, name: "MeeMart Original" },
    ],
  });
});

app.use(errorHandler);

let port = process.env.PORT || 8080;

connectDB()
  .then(async () => {
    // Tự động khởi tạo hệ thống IAM Roles & Policies nếu chưa có
    await iamService.initDefaultIAM();

    // Nạp ma trận Multimodal Vector Search (Qwen3-VL 2048-dim) vào bộ nhớ RAM
    vectorSearchService.init();
    
    app.listen(port, () => {
      console.log("Backend nodejs is running on the port: " + port);
    });
  })
  .catch((error) => {
    console.error("Failed to connect to DB:", error);
    process.exit(1);
  });
