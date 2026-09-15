import db from "../models/index.js";

async function syncAndSeed() {
  try {
    console.log("Syncing database for PaymentLog...");
    // Create new table
    await db.PaymentLog.sync({ force: true }); // drop old if exists, create new

    // Drop old table if exists
    try {
      await db.sequelize.query("DROP TABLE IF EXISTS `webhook_logs`;");
      console.log("Dropped webhook_logs table.");
    } catch (err) {
      console.log("No webhook_logs table found.");
    }

    console.log("Seeding PaymentLog with dummy data...");
    const dummyData = [
      {
        order_code: "ORD-100234",
        gateway_name: "VNPAY",
        amount: 500000.00,
        status: "PAID",
        trans_id: "VNP12345678",
        message: "Giao dịch thành công",
        transaction_time: new Date(Date.now() - 1000 * 60 * 60 * 2),
      },
      {
        order_code: "ORD-100235",
        gateway_name: "MOMO",
        amount: 250000.00,
        status: "PAID",
        trans_id: "MOMO234234234",
        message: "Successful.",
        transaction_time: new Date(Date.now() - 1000 * 60 * 60 * 24),
      },
      {
        order_code: "ORD-100236",
        gateway_name: "ZALOPAY",
        amount: 150000.00,
        status: "FAILED",
        trans_id: "231024_ORD-100236",
        message: "Lỗi kết nối từ server cổng thanh toán",
        transaction_time: new Date(Date.now() - 1000 * 60 * 30),
      },
      {
        order_code: "ORD-100237",
        gateway_name: "VNPAY",
        amount: 300000.00,
        status: "FAILED",
        trans_id: null,
        message: "Khách hàng hủy giao dịch",
        transaction_time: new Date(Date.now() - 1000 * 60 * 5),
      },
      {
        order_code: "ORD-100238",
        gateway_name: "COD",
        amount: 450000.00,
        status: "UNPAID",
        trans_id: null,
        message: "Chờ khách nhận hàng và thanh toán",
        transaction_time: new Date(),
      },
    ];

    await db.PaymentLog.bulkCreate(dummyData);
    console.log("Seeding completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Error syncing and seeding DB:", error);
    process.exit(1);
  }
}

syncAndSeed();
