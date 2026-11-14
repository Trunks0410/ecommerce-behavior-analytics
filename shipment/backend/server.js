import "dotenv/config";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sequelize from "./src/db/sequelize.js";
import { migrate } from "./src/db/migrate.js";
import shipmentRoutes from "./src/routes/shipment.routes.js";
import shipperRoutes from "./src/routes/shipper.routes.js";

const app = express();
const port = Number(process.env.PORT_SHIPMENT || 8090);
const currentDirectory = path.dirname(fileURLToPath(import.meta.url));

const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:5174,http://127.0.0.1:5174")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(morgan("dev"));
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error("Origin is not allowed by shipment service CORS policy."));
  },
  credentials: true,
}));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(cookieParser());
app.use("/uploads", express.static(path.join(currentDirectory, "uploads")));

app.get("/health", async (_req, res) => {
  try {
    await sequelize.authenticate();
    return res.status(200).json({
      status: "UP",
      service: "UTE Express Shipment Service",
      database: "UP",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("UTE Express health check database failure:", error);
    return res.status(503).json({
      status: "DEGRADED",
      service: "UTE Express Shipment Service",
      database: "DOWN",
      timestamp: new Date().toISOString(),
    });
  }
});

app.use("/api/v1/shipments", shipmentRoutes);
app.use("/api/v1/shipper", shipperRoutes);
app.use((err, _req, res, _next) => {
  if (err.name === "MulterError" || err.message?.startsWith("Only JPG, PNG")) {
    return res.status(400).json({ code: "UPLOAD_INVALID", message: err.message });
  }
  console.error("UTE Express unhandled request error:", err);
  return res.status(500).json({ code: "INTERNAL_ERROR", message: "Đã xảy ra lỗi hệ thống." });
});

export async function startServer() {
  if (!process.env.ECOMMERCE_SERVICE_API_KEY || process.env.ECOMMERCE_SERVICE_API_KEY.length < 24) {
    throw new Error("ECOMMERCE_SERVICE_API_KEY must contain at least 24 characters.");
  }
  if (!process.env.ACCESS_TOKEN_SECRET || process.env.ACCESS_TOKEN_SECRET.length < 32) {
    throw new Error("ACCESS_TOKEN_SECRET must contain at least 32 characters.");
  }

  await migrate();
  const server = app.listen(port, () => {
    console.log(`UTE Express Shipment Service listening on port ${port}.`);
  });
  return server;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  startServer().catch(async (error) => {
    console.error("Failed to start UTE Express Shipment Service:", error);
    await sequelize.close();
    process.exit(1);
  });
}

export default app;
