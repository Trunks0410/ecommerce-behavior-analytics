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

// Serve static files
app.use("/public", express.static("src/public"));

app.use(appRouter);

app.get("/brands", (req, res) => {
  return res.status(200).json({
    message: "Success",
    data: [
      { id: 1, name: "Nike" },
      { id: 2, name: "Adidas" },
      { id: 3, name: "Puma" },
      { id: 4, name: "New Balance" },
      { id: 5, name: "UTEShop Original" },
    ],
  });
});

app.use(errorHandler);

let port = process.env.PORT || 8080;

connectDB()
  .then(() => {
    app.listen(port, () => {
      console.log("Backend nodejs is running on the port: " + port);
    });
  })
  .catch((error) => {
    console.error("Failed to connect to DB:", error);
    process.exit(1);
  });
