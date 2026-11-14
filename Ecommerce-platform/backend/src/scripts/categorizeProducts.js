import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

import db from "../database/models/index.js";

// Bảng danh mục chuẩn hóa theo hệ sinh thái E-commerce
export const NEW_CATEGORIES = [
  // 1. Thời trang Nam
  { id: 1, name: "Thời trang Nam", slug: "thoi-trang-nam", parent_id: null },
  { id: 3, name: "Áo nam", slug: "ao-nam", parent_id: 1 },
  { id: 4, name: "Quần nam", slug: "quan-nam", parent_id: 1 },
  { id: 15, name: "Giày nam", slug: "giay-nam", parent_id: 1 },

  // 2. Thời trang Nữ
  { id: 2, name: "Thời trang Nữ", slug: "thoi-trang-nu", parent_id: null },
  { id: 5, name: "Áo nữ", slug: "ao-nu", parent_id: 2 },
  { id: 6, name: "Chân váy", slug: "chan-vay", parent_id: 2 },
  { id: 11, name: "Đầm nữ", slug: "dam-nu", parent_id: 2 },
  { id: 16, name: "Quần nữ", slug: "quan-nu", parent_id: 2 },
  { id: 17, name: "Giày nữ", slug: "giay-nu", parent_id: 2 },

  // 3. Phụ kiện thời trang
  { id: 13, name: "Phụ kiện thời trang", slug: "phu-kien-thoi-trang", parent_id: null },
  { id: 14, name: "Nón / Mũ", slug: "non-mu", parent_id: 13 },
  { id: 18, name: "Đồng hồ & Kính mắt", slug: "dong-ho-kinh-mat", parent_id: 13 },
  { id: 19, name: "Trang sức & Dây chuyền", slug: "trang-suc", parent_id: 13 },

  // 4. Balo & Túi ví
  { id: 20, name: "Balo & Túi ví", slug: "balo-tui-vi", parent_id: null },
  { id: 21, name: "Balo & Cặp xách", slug: "balo-cap-xach", parent_id: 20 },
  { id: 22, name: "Túi xách & Vali du lịch", slug: "tui-xach-vali", parent_id: 20 },

  // 5. Điện thoại & Phụ kiện công nghệ
  { id: 23, name: "Điện thoại & Phụ kiện", slug: "dien-thoai-phu-kien", parent_id: null },
  { id: 24, name: "Ốp lưng & Bao da điện thoại", slug: "op-lung-bao-da", parent_id: 23 },
  { id: 25, name: "Cáp sạc & Phụ kiện công nghệ", slug: "cap-sac-phu-kien-cong-nghe", parent_id: 23 },

  // 6. Nhà cửa & Đời sống
  { id: 26, name: "Nhà cửa & Đời sống", slug: "nha-cua-doi-song", parent_id: null },
  { id: 27, name: "Chăn ga gối & Rèm cửa", slug: "chan-ga-goi-rem", parent_id: 26 },
  { id: 28, name: "Đồ dùng nhà bếp & Bàn ăn", slug: "do-dung-nha-bep", parent_id: 26 },
  { id: 29, name: "Nội thất & Tiện ích gia đình", slug: "noi-that-tien-ich", parent_id: 26 },

  // 7. Sắc đẹp & Sức khỏe
  { id: 30, name: "Sắc đẹp & Sức khỏe", slug: "sac-dep-suc-khoe", parent_id: null },
  { id: 31, name: "Chăm sóc cá nhân & Cơ thể", slug: "cham-soc-co-the", parent_id: 30 },

  // 8. Bách hóa & Thực phẩm
  { id: 32, name: "Bách hóa & Thực phẩm", slug: "bach-hoa-thuc-pham", parent_id: null },
  { id: 33, name: "Thực phẩm & Đồ ăn vặt", slug: "thuc-pham-an-vat", parent_id: 32 },

  // 9. Đồ chơi & Văn phòng phẩm
  { id: 34, name: "Văn phòng phẩm & Tiện ích", slug: "van-phong-pham-tien-ich", parent_id: null },
];

export function determineCategory(name, desc = "") {
  const s = ` ${name} ${desc} `.toLowerCase();

  // 1. Ốp lưng & Bao da điện thoại (Rất nhiều trong dataset Amazon Solimo)
  if (/mobile cover|phone case|back case|cover for|carcasa|hülle|funda|custodia|hard case|soft case/i.test(s)) {
    return 24; // Ốp lưng & Bao da điện thoại
  }

  // 2. Balo, Rucksack, Vali, Túi xách
  if (/backpack|rucksack|duffle|tote bag|handbag|luggage|suitcase|vali|balo|túi đeo|bolso|borsa|sac à dos/i.test(s)) {
    if (/suitcase|luggage|vali|duffle|travel/i.test(s)) return 22; // Túi xách & Vali du lịch
    return 21; // Balo & Cặp xách
  }

  // 3. Trang sức & Dây chuyền
  if (/necklace|colgante|pendant|anillo|ring|earring|pendientes|pulsera|bracelet|vòng cổ|nhẫn|khuyên tai|dây chuyền|oro|gold|silver|plata/i.test(s)) {
    return 19; // Trang sức & Dây chuyền
  }

  // 4. Đồng hồ & Kính mắt
  if (/watch|reloj|montre|uhr|đồng hồ|kính|sunglasses|gafas|lunettes/i.test(s)) {
    return 18; // Đồng hồ & Kính mắt
  }

  // 5. Nón / Mũ
  if (/\b(hat|cap|beanie|nón|mũ|gorra|chapeau)\b/i.test(s)) {
    return 14; // Nón / Mũ
  }

  // 6. Giày dép
  if (/shoe|sneaker|trainer|loafer|boot|sandal|slippers|brogue|pumps|heels|zapatos|chaussure|schuh|giày|dép/i.test(s)) {
    if (/women|dames|mujer|donna|nữ|lady|girl|pumps|heels/i.test(s)) return 17; // Giày nữ
    return 15; // Giày nam
  }

  // 7. Cáp sạc, USB, Phụ kiện công nghệ
  if (/cable|usb|charger|adapter|hub|headphone|earphone|battery|printer|mouse|keyboard|screen protector|lead|socket|power bank|tai nghe|chuột|bàn phím|dây sạc|củ sạc/i.test(s)) {
    return 25; // Cáp sạc & Phụ kiện công nghệ
  }

  // 8. Chăn ga gối & Rèm cửa
  if (/bedding|sheet|duvet|pillow|curtain|laken|decke|sábanas|manta|chăn|ga gối|rèm/i.test(s)) {
    return 27; // Chăn ga gối & Rèm cửa
  }

  // 9. Đồ dùng nhà bếp & Bàn ăn
  if (/plate|cutlery|knife|cookware|pan|pot|box grater|cheese grater|baking|mould|panela|tazón|bát|đĩa|chảo|nồi|dao|dĩa/i.test(s)) {
    return 28; // Đồ dùng nhà bếp & Bàn ăn
  }

  // 10. Quần áo Nữ (Váy, Đầm, Áo nữ, Quần nữ)
  if (/dress|skirt|blouse|croptop|đầm|chân váy|dames|mujer|donna|\bwomen\b|\bwoman\b|\bgirl\b|(?<!\p{L})nữ(?!\p{L})/iu.test(s)) {
    if (/dress|đầm/iu.test(s)) return 11; // Đầm nữ
    if (/skirt|chân váy/iu.test(s)) return 6; // Chân váy
    if (/pant|trouser|legging|jean|short|quần/iu.test(s)) return 16; // Quần nữ
    return 5; // Áo nữ
  }

  // 11. Quần áo Nam (Áo sơ mi, Áo thun, Quần nam, Hoodie, Jacket)
  if (/shirt|sơ mi|hoodie|polo|windrunner|jacket|coat|\bmen\b|\bman\b|\bheren\b|\bhombre\b|\buomo\b|(?<!\p{L})nam(?!\p{L})/iu.test(s)) {
    if (/pant|trouser|jean|short|quần/iu.test(s)) return 4; // Quần nam
    return 3; // Áo nam
  }

  // 12. Áo / Quần nói chung nếu chưa vào nhóm nam/nữ cụ thể
  if (/t-shirt|tee\b|áo sơ mi|sơ mi|áo thun|áo khoác|áo len|sweater|\báo\b/iu.test(s)) {
    return 3; // Áo nam
  }
  if (/quần jean|quần short|quần dài|quần tây|\bquần\b/iu.test(s)) {
    return 4; // Quần nam
  }

  // 13. Chăm sóc cá nhân & Cơ thể
  if (/body wash|shampoo|soap|lotion|\bcream\b|serum|sunscreen|acne|blemish|treatment|mask|moisturizer|sữa tắm|dầu gội|kem dưỡng|nước rửa/i.test(s)) {
    return 31; // Chăm sóc cá nhân & Cơ thể
  }

  // 14. Bách hóa, Hạt dinh dưỡng & Thực phẩm (Dùng \b cho từ ngắn tránh nhầm trefoil -> oil)
  if (/cashews|almonds|\borganic\b|\bsnack\b|\bcoffee\b|\btea\b|\boil\b|\bspice\b|\bspices\b|trail mix|chocolate|\bnut\b|\bnuts\b|\bseed\b|\bseeds\b|hạt điều|hạt hạnh nhân|bánh kẹo|thực phẩm/i.test(s)) {
    return 33; // Thực phẩm & Đồ ăn vặt
  }

  // 15. Văn phòng phẩm, thú cưng & đồ chơi
  if (/cat tower|pet|toy|marker|pen|stationery|canvas|bảng|đồ chơi/i.test(s)) {
    return 34; // Văn phòng phẩm & Tiện ích
  }

  // 16. Nội thất & Tiện ích gia đình (Fallback an toàn cho đồ gia dụng)
  return 29;
}

async function run() {
  console.log("=== BẮT ĐẦU PHÂN LOẠI DANH MỤC SẢN PHẨM ===");

  // 1. Kiểm tra hoặc cập nhật danh sách Category vào Database
  for (const cat of NEW_CATEGORIES) {
    const existing = await db.Category.findByPk(cat.id);
    if (!existing) {
      await db.Category.create(cat);
      console.log(`+ Đã tạo mới danh mục: [${cat.id}] ${cat.name} (${cat.slug})`);
    } else {
      await existing.update({
        name: cat.name,
        slug: cat.slug,
        parent_id: cat.parent_id,
      });
    }
  }

  // 2. Lấy toàn bộ sản phẩm
  const products = await db.Product.findAll({
    attributes: ["id", "name", "description", "category_id"],
    raw: true,
  });
  console.log(`Tổng số sản phẩm cần gán danh mục: ${products.length}`);

  const catGroups = {};
  const distribution = {};

  for (const p of products) {
    const newCatId = determineCategory(p.name, p.description || "");
    distribution[newCatId] = (distribution[newCatId] || 0) + 1;

    if (p.category_id !== newCatId) {
      if (!catGroups[newCatId]) catGroups[newCatId] = [];
      catGroups[newCatId].push(p.id);
    }
  }

  let updateCount = 0;
  for (const [catId, ids] of Object.entries(catGroups)) {
    if (ids.length > 0) {
      // Chia thành các chunk 500 ids để bulk update siêu nhanh
      for (let i = 0; i < ids.length; i += 500) {
        const chunk = ids.slice(i, i + 500);
        await db.Product.update(
          { category_id: parseInt(catId) },
          { where: { id: { [db.Sequelize.Op.in]: chunk } } }
        );
      }
      updateCount += ids.length;
      console.log(`  -> Gán ${ids.length} sản phẩm vào danh mục ID: ${catId}`);
    }
  }

  console.log(`\n=== KẾT QUẢ PHÂN BỔ DANH MỤC THỰC TẾ (${updateCount} sản phẩm đã được cập nhật) ===`);
  NEW_CATEGORIES.forEach((c) => {
    if (distribution[c.id]) {
      console.log(`• [${c.id}] ${c.name} (${c.slug}): ${distribution[c.id]} sản phẩm`);
    }
  });

  // Sample kiểm tra 10 sản phẩm
  const sample = await db.Product.findAll({
    limit: 15,
    include: [{ model: db.Category, as: "category" }],
  });
  console.log("\n=== KIỂM TRA MẪU SẢN PHẨM SAU KHI GÁN DANH MỤC ===");
  sample.forEach((p) => {
    console.log(`- [${p.id}] ${p.name.slice(0, 50)}... ➔ Danh mục: [${p.category?.name}]`);
  });

  process.exit(0);
}

run().catch((e) => {
  console.error("Lỗi:", e);
  process.exit(1);
});
