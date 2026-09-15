import db from "../../database/models/index.js";

let connectDB = async () => {
  await db.sequelize.authenticate();
  
  try {
    // Manual database migrations removed to use standard Sequelize migrations instead.
  } catch (err) {
    console.log("Manual migration skipped/already completed:", err.message);
  }

  await db.sequelize.sync();
  console.log("Connection has been established successfully.");
};

export { connectDB };

