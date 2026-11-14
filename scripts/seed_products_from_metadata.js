#!/usr/bin/env node
/**
 * Standalone Script: Seed 5,000 Products from product_metadata.json into MySQL
 * Usage: node scripts/seed_products_from_metadata.js
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import mysql from "mysql2/promise";
import "dotenv/config";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function slugify(text) {
  if (!text) return "san-pham";
  return text
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function findMetadataPath() {
  const candidatePaths = [
    path.resolve(__dirname, "../Ecommerce-platform/vector-data/product_metadata.json"),
    path.resolve(__dirname, "../data/multimodal_embeddings/product_metadata.json"),
    path.resolve(__dirname, "../vector-data/product_metadata.json"),
    path.resolve(process.cwd(), "Ecommerce-platform/vector-data/product_metadata.json"),
    path.resolve(process.cwd(), "vector-data/product_metadata.json"),
  ];

  for (const p of candidatePaths) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

async function main() {
  const metaPath = findMetadataPath();
  if (!metaPath) {
    console.error("❌ Không tìm thấy file product_metadata.json");
    process.exit(1);
  }

  console.log("==================================================================");
  console.log(`📦 BẮT ĐẦU SEED SẢN PHẨM TỪ: ${metaPath}`);
  console.log("==================================================================");

  const rawData = fs.readFileSync(metaPath, "utf-8");
  const items = JSON.parse(rawData);
  console.log(`✓ Đã nạp ${items.length} sản phẩm từ metadata.`);

  // Cấu hình kết nối MySQL
  const dbConfig = {
    host: process.env.DB_HOST || "127.0.0.1",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : "",
    database: process.env.DB_NAME || "ecommerce_platform",
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
  };

  console.log(`🔌 Đang kết nối tới MySQL [${dbConfig.user}@${dbConfig.host}:${dbConfig.port}/${dbConfig.database}]...`);
  
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log("✓ Kết nối cơ sở dữ liệu thành công!");
  } catch (err) {
    console.error("❌ Không thể kết nối tới MySQL:", err.message);
    console.log("💡 Mẹo: Hãy đảm bảo MySQL service (XAMPP / Docker / MySQL Server) đang chạy trên port 3306.");
    process.exit(1);
  }

  try {
    const basePrices = [120000, 180000, 250000, 320000, 450000, 590000, 750000, 890000, 1200000, 1500000];
    const seenSlugs = new Set();
    const seenSkus = new Set();

    const productRows = [];
    const imageRows = [];
    const variantRows = [];

    const now = new Date();

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const syncIndex = item.sync_index || (i + 1);
      const itemId = item.item_id || `ITEM_${syncIndex}`;
      const title = (item.title || `Sản phẩm ${syncIndex}`).trim().slice(0, 300);

      const baseSlug = slugify(title).slice(0, 180) || "san-pham";
      let slug = `${baseSlug}-${itemId.toLowerCase()}-${syncIndex}`;
      if (seenSlugs.has(slug)) slug = `${slug}-${Math.random().toString(36).substring(2, 6)}`;
      seenSlugs.add(slug);

      let sku = itemId;
      if (seenSkus.has(sku)) sku = `${itemId}-${syncIndex}`;
      seenSkus.add(sku);

      const price = basePrices[i % basePrices.length];
      const hasSale = i % 3 === 0;
      const salePrice = hasSale ? Math.round((price * 0.85) / 1000) * 1000 : null;
      const shopId = (i % 2) + 1;
      const categoryId = (i % 24) + 1;
      const imageUrl = item.s3_image_url || "https://amazon-berkeley-objects.s3.amazonaws.com/images/small/8c/8ccb5859.jpg";

      productRows.push([
        syncIndex,
        shopId,
        categoryId,
        title,
        slug,
        `Sản phẩm chính hãng Amazon Berkeley Objects (Mã: ${itemId}). Phân phối bởi Shop đối tác của MeeMart.`,
        price,
        salePrice,
        (i * 7) % 350,
        (i * 17) % 2500 + 30,
        i % 4 === 0 ? 1 : 0,
        i % 7 === 0 ? 1 : 0,
        "UNISEX",
        "Chất lượng cao",
        "APPROVED",
        now,
        now,
      ]);

      imageRows.push([
        syncIndex,
        imageUrl,
        1,
        0,
      ]);

      variantRows.push([
        syncIndex,
        sku,
        "Tiêu chuẩn",
        "Mặc định",
        "#222222",
        price,
        salePrice,
        100 + (i % 200),
        1,
        imageUrl,
      ]);
    }

    const BATCH_SIZE = 500;

    // 1. Insert products
    console.log("\n[1/3] Đang nạp dữ liệu vào bảng 'products'...");
    for (let i = 0; i < productRows.length; i += BATCH_SIZE) {
      const chunk = productRows.slice(i, i + BATCH_SIZE);
      const query = `
        INSERT INTO products 
        (id, shop_id, category_id, name, slug, description, price, sale_price, sold_count, view_count, is_new, is_featured, gender, material, approval_status, created_at, updated_at)
        VALUES ?
        ON DUPLICATE KEY UPDATE 
          name = VALUES(name),
          price = VALUES(price),
          sale_price = VALUES(sale_price),
          approval_status = VALUES(approval_status)
      `;
      await connection.query(query, [chunk]);
      process.stdout.write(`  ✓ Đã nạp ${Math.min(i + BATCH_SIZE, productRows.length)} / ${productRows.length} sản phẩm\r`);
    }
    console.log();

    // 2. Insert product_images
    console.log("[2/3] Đang nạp dữ liệu vào bảng 'product_images'...");
    for (let i = 0; i < imageRows.length; i += BATCH_SIZE) {
      const chunk = imageRows.slice(i, i + BATCH_SIZE);
      const query = `
        INSERT IGNORE INTO product_images 
        (product_id, image_url, is_primary, sort_order)
        VALUES ?
      `;
      await connection.query(query, [chunk]);
      process.stdout.write(`  ✓ Đã nạp ${Math.min(i + BATCH_SIZE, imageRows.length)} / ${imageRows.length} ảnh\r`);
    }
    console.log();

    // 3. Insert product_variants
    console.log("[3/3] Đang nạp dữ liệu vào bảng 'product_variants'...");
    for (let i = 0; i < variantRows.length; i += BATCH_SIZE) {
      const chunk = variantRows.slice(i, i + BATCH_SIZE);
      const query = `
        INSERT INTO product_variants 
        (product_id, sku, size, color, color_hex, price, sale_price, stock_quantity, is_active, image_url)
        VALUES ?
        ON DUPLICATE KEY UPDATE 
          price = VALUES(price),
          sale_price = VALUES(sale_price),
          stock_quantity = VALUES(stock_quantity)
      `;
      await connection.query(query, [chunk]);
      process.stdout.write(`  ✓ Đã nạp ${Math.min(i + BATCH_SIZE, variantRows.length)} / ${variantRows.length} biến thể SKU\r`);
    }
    console.log();

    console.log("\n==================================================================");
    console.log(`🎉 HOÀN TẤT SEED THÀNH CÔNG ${items.length} SẢN PHẨM VÀO DATABASE!`);
    console.log("==================================================================");
  } finally {
    await connection.end();
  }
}

main().catch(err => {
  console.error("❌ Lỗi khi thực hiện seed:", err);
  process.exit(1);
});

