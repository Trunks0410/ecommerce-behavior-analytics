import "dotenv/config";

const dbConfig = {
  username: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : "",
  database: process.env.DB_NAME || "ecommerce_platform",
  host: process.env.DB_HOST || "127.0.0.1",
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
  dialect: process.env.DB_DIALECT || "mysql",
  logging: process.env.DB_LOGGING === "true" ? console.log : false,
  dialectOptions: {
    multipleStatements: true,
  },
  timezone: process.env.DB_TIMEZONE || "+07:00",
};

const config = {
  development: dbConfig,
  test: dbConfig,
  production: dbConfig,
  ...dbConfig,
};

export default config;
