import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
  up: async (queryInterface, Sequelize) => {
    try {
      const sqlPath = path.join(__dirname, "../database/schema.sql");
      const sqlContent = fs.readFileSync(sqlPath, "utf-8");

      const statements = sqlContent
        .split(/;\s*$/m)
        .map((stmt) => stmt.trim())
        .filter((stmt) => stmt.length > 0);

      for (const statement of statements) {
        await queryInterface.sequelize.query(statement);
      }
      console.log("Successfully executed schema.sql init migration.");
    } catch (error) {
      console.error("Error executing schema.sql migration:", error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    // No drop all needed for this project
  },
};
