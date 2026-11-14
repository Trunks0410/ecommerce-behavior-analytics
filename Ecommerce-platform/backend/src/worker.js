import "dotenv/config";
import { connectDB } from "./core/config/DBConfig.js";
import { startCronJobs } from "./core/utils/scheduler.js";

console.log("Starting Worker Process...");

connectDB()
  .then(() => {
    startCronJobs();
    console.log("Worker process initialized and connected to DB.");
  })
  .catch((error) => {
    console.error("Worker failed to connect to DB:", error);
    process.exit(1);
  });
