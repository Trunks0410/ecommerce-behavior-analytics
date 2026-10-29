import cron from "node-cron";
import orderService from "../services/orderService.js";

// Khởi chạy các cron jobs trong một worker độc lập
export const startCronJobs = () => {
  console.log("Starting background cron jobs...");

  // Auto-complete delivered orders every 5 minutes
  cron.schedule("*/5 * * * *", () => {
    console.log("Running auto-completion check for delivered orders...");
    orderService.autoCompleteDeliveredOrders();
  });
};
