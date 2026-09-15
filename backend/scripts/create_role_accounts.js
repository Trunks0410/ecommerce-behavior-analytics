import "dotenv/config";
import db from "../src/models/index.js";
import bcrypt from "bcryptjs";

async function run() {
  try {
    const roles = [
      { id: 1, name: "admin", email: "admin@gmail.com", fullName: "Admin User" },
      { id: 2, name: "manager", email: "manager@gmail.com", fullName: "Manager User" },
      { id: 3, name: "vendor", email: "vendor@gmail.com", fullName: "Vendor User" },
      { id: 4, name: "shipper", email: "shipper@gmail.com", fullName: "Shipper User" },
      { id: 5, name: "user", email: "user@gmail.com", fullName: "Regular User" }
    ];

    const passwordHash = await bcrypt.hash("123456", 10);

    for (const r of roles) {
      console.log(`Processing role ${r.name}...`);
      
      // 1. Check if user already exists
      let user = await db.User.findOne({ where: { email: r.email } });
      
      if (!user) {
        // Create user
        user = await db.User.create({
          email: r.email,
          password: passwordHash,
          role_id: r.id,
          status: "ACTIVE",
          phone: `098765430${r.id}`
        });
        console.log(`Created user ${r.email} with id ${user.id}`);
      } else {
        // Update user
        user.password = passwordHash;
        user.role_id = r.id;
        user.status = "ACTIVE";
        await user.save();
        console.log(`Updated user ${r.email}`);
      }

      // 2. Create profile if not exists
      let profile = await db.UserProfile.findOne({ where: { user_id: user.id } });
      if (!profile) {
        await db.UserProfile.create({
          user_id: user.id,
          full_name: r.fullName,
          gender: "OTHER"
        });
        console.log(`Created profile for ${r.email}`);
      } else {
        profile.full_name = r.fullName;
        await profile.save();
        console.log(`Updated profile for ${r.email}`);
      }

      // 3. Special handling for vendor (needs a shop)
      if (r.name === "vendor") {
        let shop = await db.Shop.findOne({ where: { vendor_id: user.id } });
        if (!shop) {
          await db.Shop.create({
            vendor_id: user.id,
            shop_name: "Cửa hàng của Vendor",
            description: "Gian hàng bán các sản phẩm thời trang cao cấp",
            status: "APPROVED",
            rating: 5.0
          });
          console.log(`Created shop for vendor ${r.email}`);
        }
      }
    }
    
    console.log("All role accounts processed successfully!");
  } catch (error) {
    console.error("Error creating role accounts:", error);
  } finally {
    await db.sequelize.close();
  }
}

run();
