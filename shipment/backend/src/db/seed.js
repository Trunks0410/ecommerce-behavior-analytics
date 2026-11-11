import "dotenv/config";
import bcrypt from "bcryptjs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sequelize from "./sequelize.js";
import { Agent } from "./models.js";
import { migrate } from "./migrate.js";

export async function seed() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("The demo seed is disabled in production.");
  }
  await migrate();
  const password = process.env.DEMO_SHIPPER_PASSWORD || "Shipper@123";
  const passwordHash = await bcrypt.hash(password, 12);
  const agents = [
    { email: "shipper01@ute-express.local", phone: "0900000001", fullName: "Nguyễn Văn An", serviceAreas: ["Quận 1", "Quận 3"] },
    { email: "shipper02@ute-express.local", phone: "0900000002", fullName: "Trần Văn Bình", serviceAreas: ["Bình Thạnh", "Quận 1"] },
    { email: "shipper03@ute-express.local", phone: "0900000003", fullName: "Lê Minh Hoàng", serviceAreas: [] },
  ];

  for (const agent of agents) {
    await Agent.findOrCreate({
      where: { email: agent.email },
      defaults: {
        ...agent,
        passwordHash,
        role: "SHIPPER",
        accountStatus: "ACTIVE",
        availability: "AVAILABLE",
      },
    });
  }
  console.log(`Seeded ${agents.length} UTE Express demo shipper accounts.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  seed()
    .then(() => sequelize.close())
    .catch(async (error) => {
      console.error("UTE Express seed failed:", error);
      await sequelize.close();
      process.exitCode = 1;
    });
}
