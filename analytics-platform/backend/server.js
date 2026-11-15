import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import vectorSearchEngine from "./src/modules/search/vectorSearch.service.js";
import searchRoutes from "./src/modules/search/search.routes.js";
import authRoutes from "./src/modules/auth/auth.routes.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 8088;

// Middleware
app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));

// Request Logger đơn giản
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    console.log(`[ANALYTICS:8088] ${req.method} ${req.originalUrl} ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json(vectorSearchEngine.getStatus());
});

// Auth proxy endpoint (dành cho analytics dashboard frontend)
app.use("/auth", authRoutes);

// Search & Vector APIs
app.use("/api/v1/search", searchRoutes);
app.use("/api/v1/vector", searchRoutes);
app.use("/api/v1/recommendations", searchRoutes);

// Khởi tạo vector index trong RAM
vectorSearchEngine.init();

app.listen(port, () => {
  console.log("=====================================================");
  console.log(`🚀 [ANALYTICS & SEARCH MICROSERVICE]`);
  console.log(`📡 Server running on: http://localhost:${port}`);
  console.log(`🔍 Search Endpoint: http://localhost:${port}/api/v1/search?query=...`);
  console.log(`💡 Health Check:   http://localhost:${port}/health`);
  console.log("=====================================================");
});
