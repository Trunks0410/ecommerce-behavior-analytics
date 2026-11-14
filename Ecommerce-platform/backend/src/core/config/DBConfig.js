import db from "../../database/models/index.js";

let connectDB = async () => {
  await db.sequelize.authenticate();
  console.log("Connection has been established successfully.");
};

export { connectDB };
