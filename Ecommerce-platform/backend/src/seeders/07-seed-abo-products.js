import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

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

/**
 * Tìm file product_metadata.json theo các đường dẫn tiềm năng
 */
function findMetadataPath() {
  const candidatePaths = [
    path.resolve(__dirname, "../../../vector-data/product_metadata.json"),
    path.resolve(__dirname, "../../vector-data/product_metadata.json"),
    path.resolve(process.cwd(), "vector-data/product_metadata.json"),
    path.resolve(process.cwd(), "Ecommerce-platform/vector-data/product_metadata.json"),
    path.resolve(process.cwd(), "data/multimodal_embeddings/product_metadata.json"),
    path.resolve(process.cwd(), "../data/multimodal_embeddings/product_metadata.json"),
  ];

  for (const p of candidatePaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }
  return null;
}

/** @type {import('sequelize-cli').Migration} */
export default {
  async up(queryInterface, Sequelize) {
    const metaPath = findMetadataPath();
    if (!metaPath) {
      console.warn("⚠️ [07-seed-abo-products] Không tìm thấy file product_metadata.json. Bỏ qua seed ABO products.");
      return;
    }

    console.log(`🚀 [07-seed-abo-products] Đang đọc metadata từ: ${metaPath}...`);
    const rawData = fs.readFileSync(metaPath, "utf-8");
    const items = JSON.parse(rawData);

    if (!Array.isArray(items) || items.length === 0) {
      console.warn("⚠️ [07-seed-abo-products] Danh sách metadata trống.");
      return;
    }

    const totalCount = items.length;
    console.log(`📦 [07-seed-abo-products] Bắt đầu gieo mầm ${totalCount} sản phẩm từ ABO dataset...`);

    const now = new Date();
    const basePrices = [120000, 180000, 250000, 320000, 450000, 590000, 750000, 890000, 1200000, 1500000];

    const seenSlugs = new Set();
    const seenSkus = new Set();

    const products = [];
    const productImages = [];
    const productVariants = [];

    for (let i = 0; i < totalCount; i++) {
      const item = items[i];
      const syncIndex = item.sync_index || (i + 1);
      const itemId = item.item_id || `ITEM_${syncIndex}`;
      const title = (item.title || `Sản phẩm ${syncIndex}`).trim().slice(0, 300);

      // 1. Unique Slug & SKU
      const baseSlug = slugify(title).slice(0, 180) || "san-pham";
      let slug = `${baseSlug}-${itemId.toLowerCase()}-${syncIndex}`;
      if (seenSlugs.has(slug)) {
        slug = `${slug}-${Math.random().toString(36).substring(2, 7)}`;
      }
      seenSlugs.add(slug);

      let sku = itemId;
      if (seenSkus.has(sku)) {
        sku = `${itemId}-${syncIndex}`;
      }
      seenSkus.add(sku);

      // 2. Giá cả & Khuyến mãi thực tế
      const price = basePrices[i % basePrices.length];
      const hasSale = i % 3 === 0;
      const salePrice = hasSale ? Math.round((price * 0.85) / 1000) * 1000 : null;

      // 3. Phân bổ Shop và Category
      // Shop 1 (TechMart Hub) và Shop 2 (HomePlus Store)
      const shopId = (i % 2) + 1;
      // Phân bổ vào 24 categories hiện có trong hệ thống
      const categoryId = (i % 24) + 1;

      // 4. Object Product
      products.push({
        id: syncIndex,
        shop_id: shopId,
        category_id: categoryId,
        name: title,
        slug: slug,
        description: `Sản phẩm chính hãng Amazon Berkeley Objects (Mã: ${itemId}). Phân phối bởi Shop đối tác của MeeMart. Bảo hành chính hãng 12 tháng.`,
        price: price,
        sale_price: salePrice,
        sold_count: (i * 7) % 350,
        view_count: (i * 17) % 2500 + 30,
        is_new: i % 4 === 0 ? 1 : 0,
        is_featured: i % 7 === 0 ? 1 : 0,
        gender: "UNISEX",
        material: "Chất lượng cao",
        approval_status: "APPROVED",
        created_at: now,
        updated_at: now,
      });

      // 5. Object Product Image
      const imageUrl = item.s3_image_url || "https://amazon-berkeley-objects.s3.amazonaws.com/images/small/8c/8ccb5859.jpg";
      productImages.push({
        product_id: syncIndex,
        image_url: imageUrl,
        is_primary: 1,
        sort_order: 0,
      });

      // 6. Object Product Variant
      productVariants.push({
        product_id: syncIndex,
        sku: sku,
        size: "Tiêu chuẩn",
        color: "Mặc định",
        color_hex: "#222222",
        price: price,
        sale_price: salePrice,
        stock_quantity: 100 + (i % 200),
        is_active: 1,
        image_url: imageUrl,
      });
    }

    // 7. Thực hiện Bulk Insert theo từng Batch 500 bản ghi để tối ưu tốc độ và an toàn bộ nhớ
    const BATCH_SIZE = 500;

    console.log("➡️ Đang chèn bảng 'products'...");
    for (let i = 0; i < products.length; i += BATCH_SIZE) {
      const chunk = products.slice(i, i + BATCH_SIZE);
      await queryInterface.bulkInsert("products", chunk, { ignoreDuplicates: true });
    }

    console.log("➡️ Đang chèn bảng 'product_images'...");
    for (let i = 0; i < productImages.length; i += BATCH_SIZE) {
      const chunk = productImages.slice(i, i + BATCH_SIZE);
      await queryInterface.bulkInsert("product_images", chunk, { ignoreDuplicates: true });
    }

    console.log("➡️ Đang chèn bảng 'product_variants'...");
    for (let i = 0; i < productVariants.length; i += BATCH_SIZE) {
      const chunk = productVariants.slice(i, i + BATCH_SIZE);
      await queryInterface.bulkInsert("product_variants", chunk, { ignoreDuplicates: true });
    }

    console.log(`✅ [07-seed-abo-products] Hoàn tất gieo mầm ${totalCount} sản phẩm thành công!`);
  },

  async down(queryInterface, Sequelize) {
    // Xóa các sản phẩm đã seed
    await queryInterface.bulkDelete("product_variants", null, {});
    await queryInterface.bulkDelete("product_images", null, {});
    await queryInterface.bulkDelete("products", null, {});
  },
};

