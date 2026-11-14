import "dotenv/config";
import { Sequelize } from "sequelize";

const required = ["SHIPMENT_DB_NAME", "DB_USER", "DB_HOST"];
const missing = required.filter((key) => !process.env[key]);

if (missing.length > 0) {
  throw new Error(`Missing shipment database configuration: ${missing.join(", ")}`);
}

const sequelize = new Sequelize(
  process.env.SHIPMENT_DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD || "",
  {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    dialect: process.env.DB_DIALECT || "mysql",
    dialectOptions: { multipleStatements: true },
    logging: process.env.DB_LOGGING === "true" ? console.log : false,
    timezone: process.env.DB_TIMEZONE || "+07:00",
    define: {
      underscored: true,
      timestamps: true,
    },
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  },
);

export default sequelize;
