import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sequelize from "./sequelize.js";

const directory = path.dirname(fileURLToPath(import.meta.url));

export async function migrate() {
  await sequelize.authenticate();
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS shipment_schema_migrations (
      name VARCHAR(190) NOT NULL PRIMARY KEY,
      applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB
  `);

  const migration = "001_initial.sql";
  const [applied] = await sequelize.query(
    "SELECT name FROM shipment_schema_migrations WHERE name = ?",
    { replacements: [migration] },
  );
  if (applied.length === 0) {
    const sql = await fs.readFile(path.join(directory, "migrations", migration), "utf8");
    await sequelize.query(sql);
    await sequelize.query(
      "INSERT INTO shipment_schema_migrations (name) VALUES (?)",
      { replacements: [migration] },
    );
    console.log(`Applied shipment migration ${migration}`);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  migrate()
    .then(() => sequelize.close())
    .catch(async (error) => {
      console.error("Shipment database migration failed:", error);
      await sequelize.close();
      process.exitCode = 1;
    });
}
