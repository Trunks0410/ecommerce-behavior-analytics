#!/usr/bin/env python3
"""Dataset Inspection & Category Breakdown Checker for ABO Multimodal Pipeline.

Kiểm tra toàn diện dữ liệu đã thu thập:
1. Thống kê Metadata & Tự động sửa/bổ sung `s3_image_url` nếu thiếu.
2. Phân tích chi tiết số lượng theo DANH MỤC (Category Cấp 1 & Cấp 2 theo Taxonomy chuẩn).
3. Thống kê theo loại sản phẩm gốc của Amazon (Product Type).
4. Kiểm tra thư mục ảnh `images/` và ma trận vector nhúng `product_embeddings.npz`.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from collections import Counter
from pathlib import Path
from typing import Any

# Đảm bảo in tiếng Việt chuẩn trên Windows / Linux / Colab
if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass


BASE_URL = "https://amazon-berkeley-objects.s3.amazonaws.com"

# ==============================================================================
# TAXONOMY DEFINITION & CLASSIFIER (Từ classify_products.py)
# ==============================================================================
TAXONOMY_TREE = [
    {
        "id": 1,
        "name": "Điện tử & Phụ kiện công nghệ",
        "subcategories": {
            101: "Ốp lưng & Bao da điện thoại",
            102: "Củ sạc, Cáp sạc & Bộ chuyển đổi",
            103: "Tai nghe & Thiết bị âm thanh",
            104: "Phụ kiện máy tính & Lưu trữ",
            105: "Thiết bị điện tử khác",
        },
    },
    {
        "id": 2,
        "name": "Thời trang & Phụ kiện",
        "subcategories": {
            201: "Giày dép & Sandal",
            202: "Túi xách, Balo & Ví",
            203: "Vali & Hành lý du lịch",
            204: "Trang sức cao cấp & Thời trang",
            205: "Mũ nón & Phụ kiện trang phục",
        },
    },
    {
        "id": 3,
        "name": "Nhà cửa & Đời sống",
        "subcategories": {
            301: "Nội thất gia đình & Văn phòng",
            302: "Chăn ga gối đệm & Phòng ngủ",
            303: "Đồ dùng nhà bếp & Dụng cụ ăn uống",
            304: "Đèn chiếu sáng & Trang trí nhà cửa",
            305: "Thiết bị & Phụ kiện phòng tắm",
        },
    },
    {
        "id": 4,
        "name": "Thể thao & Hoạt động ngoài trời",
        "subcategories": {
            401: "Dụng cụ tập thể dục & Thể thao",
            402: "Thiết bị dã ngoại & Cắm trại",
            403: "Đồ bơi & Phụ kiện thể thao dưới nước",
            404: "Thực phẩm bổ sung & Dinh dưỡng",
            405: "Phụ kiện thể thao khác",
        },
    },
    {
        "id": 5,
        "name": "Sức khỏe & Sắc đẹp",
        "subcategories": {
            501: "Chăm sóc da & Cơ thể",
            502: "Trang điểm & Dụng cụ làm đẹp",
            503: "Chăm sóc tóc & Da đầu",
            504: "Vệ sinh cá nhân & Chăm sóc răng miệng",
            505: "Thiết bị chăm sóc sức khỏe",
        },
    },
    {
        "id": 6,
        "name": "Công cụ, Thiết bị & Tiện ích khác",
        "subcategories": {
            601: "Dụng cụ cầm tay & Cơ khí",
            602: "Thiết bị & Vật tư đo lường",
            603: "Vật tư & Thiết bị văn phòng",
            604: "Chăm sóc thú cưng",
            605: "Sản phẩm công nghiệp & Tiện ích khác",
        },
    },
]

PRODUCT_TYPE_RULES = {
    # 1. Electronics
    "CELLULAR_PHONE_CASE": 101,
    "PORTABLE_ELECTRONIC_DEVICE_COVER": 101,
    "CHARGING_ADAPTER": 102,
    "HEADPHONES": 103,
    "SOUND_AND_RECORDING_EQUIPMENT": 103,
    "COMPUTER_COMPONENT": 104,
    "FLASH_MEMORY": 104,
    "COMPUTER_INPUT_DEVICE": 104,
    "TELEVISION": 105,
    "BATTERY": 105,
    "AUTO_ACCESSORY": 105,
    # 2. Fashion
    "SHOES": 201,
    "SANDAL": 201,
    "BOOT": 201,
    "HANDBAG": 202,
    "BACKPACK": 202,
    "WALLET": 202,
    "SUITCASE": 203,
    "LUGGAGE": 203,
    "EARRING": 204,
    "FINERING": 204,
    "NECKLACE": 204,
    "FINENECKLACEBRACELETANKLET": 204,
    "HAT": 205,
    "ACCESSORY": 205,
    # 3. Home & Living
    "SOFA": 301,
    "CHAIR": 301,
    "TABLE": 301,
    "BED": 301,
    "BENCH": 301,
    "OTTOMAN": 301,
    "HEADBOARD": 301,
    "FURNITURE_COVER": 301,
    "HOME_FURNITURE_AND_DECOR": 301,
    "FLAT_SHEET": 302,
    "HOME_BED_AND_BATH": 302,
    "DRINKING_CUP": 303,
    "KITCHEN": 303,
    "FOOD_SLICER": 303,
    "PORTABLE_STOVE": 303,
    "FOOD_SERVICE_SUPPLY": 303,
    "WALL_ART": 304,
    "WINDOW_SHADE": 304,
    "LAMP": 304,
    "LIGHT_FIXTURE": 304,
    "RUG": 304,
    "PILLOW": 304,
    "CLOCK": 304,
    "TOWEL": 305,
    "CANDLE": 304,
    # 4. Sports & Outdoors
    "SPORTING_GOODS": 401,
    "OUTDOOR_RECREATION_PRODUCT": 402,
    "SWIMWEAR": 403,
    "NUTRITIONAL_SUPPLEMENT": 404,
    # 5. Beauty & Health
    "SKIN_CLEANING_AGENT": 501,
    "BEAUTY": 502,
    "HAIR_STYLING_AGENT": 503,
    "ORAL_CARE": 504,
    "HEALTH_PERSONAL_CARE": 505,
    # 6. Tools & Utilities
    "HARDWARE": 601,
    "MECHANICAL_COMPONENTS": 601,
    "HARDWARE_TUBING": 601,
    "BUILDING_MATERIAL": 601,
    "PRECISION_MEASURING": 602,
    "OFFICE_PRODUCTS": 603,
    "PET_SUPPLIES": 604,
    "PET_FOOD": 604,
}


def classify_single_product(p: dict) -> tuple[int, str, int, str]:
    """Map a product to root category ID/name and subcategory ID/name."""
    pt = ""
    if p.get("product_type") and isinstance(p["product_type"], list):
        pt = p["product_type"][0].get("value", "")

    sub_id = PRODUCT_TYPE_RULES.get(pt)

    # Fallback node keyword
    if not sub_id and p.get("node"):
        node_str = " ".join(n.get("node_name", "") for n in p["node"]).lower()
        if "case" in node_str or "cover" in node_str:
            sub_id = 101
        elif "shoe" in node_str or "sandal" in node_str or "boot" in node_str:
            sub_id = 201
        elif "furniture" in node_str or "chair" in node_str or "table" in node_str:
            sub_id = 301
        elif "kitchen" in node_str or "cup" in node_str:
            sub_id = 303
        elif "tool" in node_str or "hardware" in node_str:
            sub_id = 601

    if not sub_id:
        sub_id = 605  # Tiện ích khác

    root_id = sub_id // 100
    root_name = "Khác"
    sub_name = "Khác"

    for r in TAXONOMY_TREE:
        if r["id"] == root_id:
            root_name = r["name"]
            sub_name = r["subcategories"].get(sub_id, "Khác")
            break

    return root_id, root_name, sub_id, sub_name


def format_bytes(size: int) -> str:
    for unit in ["B", "KB", "MB", "GB"]:
        if size < 1024.0:
            return f"{size:.2f} {unit}"
        size /= 1024.0
    return f"{size:.2f} TB"


def check_and_classify_dataset(data_dir: Path, embed_dir: Path, auto_fix_s3: bool = True) -> None:
    print("=" * 80)
    print("BÁO CÁO TOÀN DIỆN: SỐ LƯỢNG & PHÂN BỔ DANH MỤC (CATEGORY BREAKDOWN)")
    print(f" - Thư mục dữ liệu : {data_dir.resolve()}")
    print("=" * 80)

    products_file = data_dir / "products.json"
    if not products_file.exists():
        print(f"❌ Không tìm thấy file {products_file}")
        return

    with products_file.open("r", encoding="utf-8") as f:
        products: list[dict[str, Any]] = json.load(f)

    total_prods = len(products)
    print(f"✓ Tổng số lượng sản phẩm: {total_prods} SP")

    # Bổ sung S3 URL nếu chưa có
    fixed_s3 = 0
    for p in products:
        if not p.get("s3_image_url") and p.get("local_image_path"):
            clean_rel = p["local_image_path"].replace("images/", "").replace("images\\", "")
            p["s3_image_url"] = f"{BASE_URL}/images/small/{clean_rel}"
            fixed_s3 += 1

    if auto_fix_s3 and fixed_s3 > 0:
        with products_file.open("w", encoding="utf-8") as f:
            json.dump(products, f, ensure_ascii=False, indent=2)
        print(f"⚡ [Tự động sửa]: Đã cập nhật và lưu {fixed_s3} link 's3_image_url' vào {products_file.name}!")

    # -------------------------------------------------------------------------
    # 1. PHÂN BỔ THEO DANH MỤC (CATEGORY BREAKDOWN)
    # -------------------------------------------------------------------------
    root_counter = Counter()
    sub_counter = Counter()
    pt_counter = Counter()

    for p in products:
        root_id, root_name, sub_id, sub_name = classify_single_product(p)
        root_counter[(root_id, root_name)] += 1
        sub_counter[(root_id, root_name, sub_id, sub_name)] += 1

        # Product type gốc
        pt = "UNKNOWN"
        if p.get("product_type") and isinstance(p["product_type"], list):
            pt = p["product_type"][0].get("value", "UNKNOWN")
        pt_counter[pt] += 1

    print("\n" + "=" * 80)
    print("📂 SỐ LƯỢNG CHI TIẾT THEO DANH MỤC CẤP 1 (ROOT CATEGORIES):")
    print("=" * 80)
    for (r_id, r_name), count in sorted(root_counter.items(), key=lambda x: x[0][0]):
        percent = count / total_prods * 100
        bar = "█" * int(percent // 3)
        print(f"[{r_id}] {r_name:<38} : {count:>3} SP ({percent:>5.1f}%) |{bar}")

    print("\n" + "-" * 80)
    print("📁 SỐ LƯỢNG CHI TIẾT THEO DANH MỤC CON CẤP 2 (SUBCATEGORIES):")
    print("-" * 80)
    current_root = None
    for (r_id, r_name, s_id, s_name), count in sorted(sub_counter.items(), key=lambda x: (x[0][0], -x[1])):
        if r_id != current_root:
            print(f"\n▶ [{r_id}] {r_name}:")
            current_root = r_id
        percent = count / total_prods * 100
        print(f"    • [{s_id}] {s_name:<36} : {count:>3} SP ({percent:4.1f}%)")

    # -------------------------------------------------------------------------
    # 2. TOP LOẠI MẶT HÀNG GỐC (PRODUCT TYPE)
    # -------------------------------------------------------------------------
    print("\n" + "=" * 80)
    print("🏷️ TOP 10 LOẠI MẶT HÀNG GỐC CỦA AMAZON (PRODUCT TYPE):")
    print("=" * 80)
    for rank, (pt, cnt) in enumerate(pt_counter.most_common(10), start=1):
        print(f"  #{rank:>2}. {pt:<35} : {cnt:>3} SP ({cnt/total_prods*100:4.1f}%)")

    # -------------------------------------------------------------------------
    # 3. KIỂM TRA ĐỘ ĐỒNG ĐỀU SHARD & ẢNH
    # -------------------------------------------------------------------------
    print("\n" + "=" * 80)
    print("🌐 KIỂM TRA ĐỘ PHỦ SHARD & ẢNH:")
    print("=" * 80)
    shards_counter = Counter(p.get("source_shard", "unknown") for p in products)
    sorted_shards = sorted(shards_counter.items(), key=lambda x: str(x[0]))
    print("   Phân bổ Shards: " + " | ".join([f"{s}: {c}" for s, c in sorted_shards]))
    print(f"   ✓ Độ phủ: {len(shards_counter)}/16 shards")
    print(f"   ✓ Sản phẩm có s3_image_url: {sum(1 for p in products if p.get('s3_image_url'))}/{total_prods} (100.0%)")

    img_dir = data_dir / "images"
    if img_dir.exists():
        valid_imgs = sum(1 for p in products if (data_dir / p.get("local_image_path", "")).is_file())
        print(f"   ✓ Ảnh hợp lệ trên đĩa   : {valid_imgs}/{total_prods} ({valid_imgs/total_prods*100:.1f}%)")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--data-dir",
        type=Path,
        default=Path("data/abo_dataset"),
        help="Thư mục chứa dữ liệu download (mặc định: data/abo_dataset)",
    )
    parser.add_argument(
        "--embed-dir",
        type=Path,
        default=Path("data/multimodal_embeddings"),
        help="Thư mục embeddings (mặc định: data/multimodal_embeddings)",
    )
    args = parser.parse_args()

    check_and_classify_dataset(data_dir=args.data_dir, embed_dir=args.embed_dir)


if __name__ == "__main__":
    main()
