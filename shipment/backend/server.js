import "dotenv/config";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import path from "path";
import { connectDB } from "../../Ecommerce-platform/backend/src/core/config/DBConfig.js";
import shipmentRoutes from "./src/routes/shipment.routes.js";
import shipperRoutes from "./src/routes/shipper.routes.js";

const app = express();
const PORT = process.env.PORT_SHIPMENT || 8090;

app.use(morgan("dev"));

const allowedOrigins = process.env.CORS_ORIGIN 
  ? process.env.CORS_ORIGIN.split(',') 
  : ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000'];

app.use(cors({ 
  origin: function(origin, callback) {
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

// Static folder for uploaded delivery proofs if stored locally
app.use("/uploads", express.static(path.resolve("public/uploads")));

// Microservice Health Check
app.get("/health", (req, res) => {
  return res.status(200).json({
    status: "UP",
    service: "Shipment & Shipper Microservice",
    timestamp: new Date().toISOString()
  });
});

// Microservice Routes
app.use("/api/v1/shipments", shipmentRoutes);
app.use("/api/v1/shipper", shipperRoutes);

// Error Handler
app.use((err, req, res, next) => {
  console.error("[Shipment Microservice Error]:", err);
  res.status(500).json({ message: err.message || "Shipment Microservice Error" });
});

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`=================================================`);
      console.log(`🚀 Shipment Microservice is running on port: ${PORT}`);
      console.log(`   Health Check: http://localhost:${PORT}/health`);
      console.log(`   Shipment API: http://localhost:${PORT}/api/v1/shipments`);
      console.log(`   Shipper API:  http://localhost:${PORT}/api/v1/shipper`);
      console.log(`=================================================`);
    });
  })
  .catch((error) => {
    console.error("Failed to connect DB for Shipment Microservice:", error);
    process.exit(1);
  });

export default app;
