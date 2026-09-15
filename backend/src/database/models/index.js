"use strict";

import fs from "fs";
import path from "path";
import Sequelize from "sequelize";
import process from "process";
import { fileURLToPath, pathToFileURL } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const basename = path.basename(__filename);
const env = process.env.NODE_ENV || "development";
const config = JSON.parse(
  fs.readFileSync(__dirname + "/../../core/config/config.json", "utf8"),
)[env];
const db = {};

let sequelize;
if (config.use_env_variable) {
  sequelize = new Sequelize(process.env[config.use_env_variable], config);
} else {
  sequelize = new Sequelize(
    process.env.DB_NAME || config.database,
    process.env.DB_USER || config.username,
    process.env.DB_PASSWORD || config.password,
    config,
  );
}

const modelFiles = fs.readdirSync(__dirname).filter((file) => {
  return (
    file.indexOf(".") !== 0 &&
    file !== basename &&
    file.slice(-3) === ".js" &&
    file.indexOf(".test.js") === -1
  );
});

for (const file of modelFiles) {
  const modelPath = pathToFileURL(path.join(__dirname, file)).href;
  const modelModule = await import(modelPath);
  const model = modelModule.default(sequelize, Sequelize.DataTypes);
  db[model.name] = model;
}

Object.keys(db).forEach((modelName) => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

export default db;
