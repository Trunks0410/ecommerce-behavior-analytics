import db from "../models/index.js";

async function clear() {
  try {
    // Xoá tất cả thông báo để người dùng kiểm thử sạch sẽ từ đầu
    await db.Notification.destroy({ where: {} });
    console.log("Cleared all notifications from database successfully.");
    process.exit(0);
  } catch (error) {
    console.error("Failed to clear notifications:", error);
    process.exit(1);
  }
}

clear();
