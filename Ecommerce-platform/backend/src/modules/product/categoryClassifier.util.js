/**
 * Tự động xác định danh mục tối ưu cho sản phẩm dựa trên tên và mô tả
 */
export function determineProductCategory(name = "", desc = "") {
  const s = ` ${name} ${desc} `.toLowerCase();

  // 1. Ốp lưng & Bao da điện thoại
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

  // 14. Bách hóa, Hạt dinh dưỡng & Thực phẩm
  if (/cashews|almonds|\borganic\b|\bsnack\b|\bcoffee\b|\btea\b|\boil\b|\bspice\b|\bspices\b|trail mix|chocolate|\bnut\b|\bnuts\b|\bseed\b|\bseeds\b|hạt điều|hạt hạnh nhân|bánh kẹo|thực phẩm/i.test(s)) {
    return 33; // Thực phẩm & Đồ ăn vặt
  }

  // 15. Văn phòng phẩm, thú cưng & đồ chơi
  if (/cat tower|pet|toy|marker|pen|stationery|canvas|bảng|đồ chơi/i.test(s)) {
    return 34; // Văn phòng phẩm & Tiện ích
  }

  // 16. Mặc định vào Nội thất & Tiện ích gia đình
  return 29;
}

export default {
  determineProductCategory,
};

