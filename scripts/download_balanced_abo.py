#!/usr/bin/env python3
"""Category-Balanced ABO Product Sampler & Downloader (5,000 Products).

Khắc phục triệt để tình trạng lệch dữ liệu (ốp điện thoại chiếm 50%):
1. Duyệt qua 16 shards trên Amazon S3.
2. Áp dụng trần danh mục (Category Cap) và trần loại sản phẩm (Product Type Cap).
   - Ốp điện thoại bị giới hạn tối đa ~200 SP (thay vì chiếm 2,500 SP).
   - Ưu tiên nhặt đều các ngành hàng: Thời trang, Đồ gia dụng, Thể thao, Sức khỏe, Công cụ.
3. Tích hợp sẵn `s3_image_url` cho 100% sản phẩm.
4. Tùy chọn `--no-images` giúp chỉ lấy metadata & link S3 trong 30 giây (không tốn ổ cứng Colab).
"""

from __future__ import annotations

import argparse
import csv
import gzip
import io
import json
import math
import os
import re
import shutil
import sys
import threading
import time
from collections import Counter
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path, PurePosixPath
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import quote
from urllib.request import Request, urlopen

# Ensure UTF-8 output on Windows / Linux / Colab
if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass


BASE_URL = "https://amazon-berkeley-objects.s3.amazonaws.com"
LISTING_SHARDS = "0123456789abcdef"
IMAGE_CATALOG_URL = f"{BASE_URL}/images/metadata/images.csv.gz"
USER_AGENT = "abo-balanced-sampler/2.0"
MAX_ATTEMPTS = 3

# Mapping product_type sang Category Cấp 1 (1: Điện tử, 2: Thời trang, 3: Nhà cửa, 4: Thể thao, 5: Sức khỏe, 6: Công cụ)
PRODUCT_TYPE_TO_ROOT = {
    # 1. Điện tử & Phụ kiện
    "CELLULAR_PHONE_CASE": 1,
    "PORTABLE_ELECTRONIC_DEVICE_COVER": 1,
    "CHARGING_ADAPTER": 1,
    "HEADPHONES": 1,
    "SOUND_AND_RECORDING_EQUIPMENT": 1,
    "COMPUTER_COMPONENT": 1,
    "FLASH_MEMORY": 1,
    "COMPUTER_INPUT_DEVICE": 1,
    "TELEVISION": 1,
    "BATTERY": 1,
    "AUTO_ACCESSORY": 1,
    # 2. Thời trang & Phụ kiện
    "SHOES": 2,
    "SANDAL": 2,
    "BOOT": 2,
    "HANDBAG": 2,
    "BACKPACK": 2,
    "WALLET": 2,
    "SUITCASE": 2,
    "LUGGAGE": 2,
    "EARRING": 2,
    "FINERING": 2,
    "NECKLACE": 2,
    "FINENECKLACEBRACELETANKLET": 2,
    "HAT": 2,
    "ACCESSORY": 2,
    # 3. Nhà cửa & Đời sống
    "SOFA": 3,
    "CHAIR": 3,
    "TABLE": 3,
    "BED": 3,
    "BENCH": 3,
    "OTTOMAN": 3,
    "HEADBOARD": 3,
    "FURNITURE_COVER": 3,
    "HOME_FURNITURE_AND_DECOR": 3,
    "FLAT_SHEET": 3,
    "HOME_BED_AND_BATH": 3,
    "DRINKING_CUP": 3,
    "KITCHEN": 3,
    "FOOD_SLICER": 3,
    "PORTABLE_STOVE": 3,
    "FOOD_SERVICE_SUPPLY": 3,
    "WALL_ART": 3,
    "WINDOW_SHADE": 3,
    "LAMP": 3,
    "LIGHT_FIXTURE": 3,
    "RUG": 3,
    "PILLOW": 3,
    "CLOCK": 3,
    "TOWEL": 3,
    "CANDLE": 3,
    # 4. Thể thao & Hoạt động ngoài trời
    "SPORTING_GOODS": 4,
    "OUTDOOR_RECREATION_PRODUCT": 4,
    "SWIMWEAR": 4,
    "NUTRITIONAL_SUPPLEMENT": 4,
    # 5. Sức khỏe & Sắc đẹp
    "SKIN_CLEANING_AGENT": 5,
    "BEAUTY": 5,
    "HAIR_STYLING_AGENT": 5,
    "ORAL_CARE": 5,
    "HEALTH_PERSONAL_CARE": 5,
    # 6. Công cụ & Tiện ích
    "HARDWARE": 6,
    "MECHANICAL_COMPONENTS": 6,
    "HARDWARE_TUBING": 6,
    "BUILDING_MATERIAL": 6,
    "PRECISION_MEASURING": 6,
    "OFFICE_PRODUCTS": 6,
    "PET_SUPPLIES": 6,
    "PET_FOOD": 6,
}


def request(url: str) -> Request:
    return Request(url, headers={"User-Agent": USER_AGENT})


def render_progress_bar(current: int, total: int, prefix: str = "", suffix: str = "", length: int = 30) -> None:
    if total <= 0:
        percent = 100.0
        filled_len = length
    else:
        percent = min(100.0, 100.0 * (current / float(total)))
        filled_len = int(length * current // total)
    bar = "█" * filled_len + "░" * (length - filled_len)
    sys.stdout.write(f"\r{prefix} |{bar}| {current}/{total} ({percent:5.1f}%) {suffix}")
    sys.stdout.flush()
    if current >= total:
        sys.stdout.write("\n")
        sys.stdout.flush()


def classify_quick(product: dict[str, Any]) -> tuple[int, str]:
    """Identify root category and product_type for quota capping."""
    pt = "UNKNOWN"
    if product.get("product_type") and isinstance(product["product_type"], list):
        pt = product["product_type"][0].get("value", "UNKNOWN")

    root_id = PRODUCT_TYPE_TO_ROOT.get(pt)
    if not root_id and product.get("node"):
        node_str = " ".join(n.get("node_name", "") for n in product["node"]).lower()
        if "case" in node_str or "cover" in node_str:
            root_id = 1
            pt = "CELLULAR_PHONE_CASE"
        elif "shoe" in node_str or "sandal" in node_str:
            root_id = 2
            pt = "SHOES"
        elif "furniture" in node_str or "chair" in node_str or "table" in node_str:
            root_id = 3
            pt = "HOME_FURNITURE_AND_DECOR"
        elif "kitchen" in node_str:
            root_id = 3
            pt = "KITCHEN"
        elif "sport" in node_str:
            root_id = 4
            pt = "SPORTING_GOODS"
        elif "beauty" in node_str or "health" in node_str:
            root_id = 5
            pt = "BEAUTY"
        elif "tool" in node_str or "hardware" in node_str:
            root_id = 6
            pt = "HARDWARE"

    if not root_id:
        root_id = 6  # Fallback Công cụ / Tiện ích khác

    return root_id, pt


def read_balanced_products(count: int = 5000) -> list[dict[str, Any]]:
    """Scan 16 shards and collect 5000 products with strict category capping."""
    products: list[dict[str, Any]] = []
    seen = set()

    # Tính trần quota để chống lệch:
    # 1. Trần cho loại mặt hàng thống trị (Ốp lưng tối đa 5% tổng số SP, tức ~250 SP)
    max_dominant_type = max(100, int(count * 0.05))
    # 2. Trần cho từng loại mặt hàng thông thường (~150 SP)
    max_regular_type = max(80, int(count * 0.04))
    # 3. Trần cho mỗi nhóm ngành Cấp 1 (~25% tổng số SP)
    max_per_root = int(count * 0.28)

    type_counts = Counter()
    root_counts = Counter()

    print(f"\n[1/3] Quét cân bằng danh mục từ Amazon S3 (Mục tiêu: {count} SP)...")
    print(f"      - Trần ốp điện thoại : tối đa {max_dominant_type} SP")
    print(f"      - Trần mỗi ngành hàng: tối đa {max_per_root} SP/ngành")

    for shard in LISTING_SHARDS:
        if len(products) >= count:
            break

        url = f"{BASE_URL}/listings/metadata/listings_{shard}.json.gz"
        try:
            with urlopen(request(url), timeout=60) as response:
                with gzip.GzipFile(fileobj=response) as compressed:
                    with io.TextIOWrapper(compressed, encoding="utf-8") as lines:
                        for line in lines:
                            if not line.strip():
                                continue
                            try:
                                prod = json.loads(line)
                            except json.JSONDecodeError:
                                continue

                            image_id = prod.get("main_image_id")
                            item_id = prod.get("item_id")
                            if not isinstance(image_id, str) or not isinstance(item_id, str):
                                continue

                            key = (item_id, prod.get("domain_name"))
                            if key in seen:
                                continue

                            root_id, pt = classify_quick(prod)

                            # Kiểm tra trần để chống nghẽn ốp lưng
                            if pt in ("CELLULAR_PHONE_CASE", "PORTABLE_ELECTRONIC_DEVICE_COVER"):
                                if type_counts[pt] >= max_dominant_type:
                                    continue
                            else:
                                if type_counts[pt] >= max_regular_type:
                                    continue

                            if root_counts[root_id] >= max_per_root:
                                # Nếu ngành này đã quá nhiều, ưu tiên nhặt ngành khác
                                continue

                            seen.add(key)
                            type_counts[pt] += 1
                            root_counts[root_id] += 1

                            prod["sync_index"] = len(products) + 1
                            prod["source_shard"] = shard
                            products.append(prod)

                            if len(products) % 50 == 0 or len(products) == count:
                                render_progress_bar(
                                    len(products),
                                    count,
                                    prefix="   Tiến độ thu thập",
                                    suffix=f"[Shard {shard}]",
                                )

                            if len(products) >= count:
                                break
        except Exception as err:
            print(f"\n   [Cảnh báo] Lỗi shard {shard}: {err}. Tiếp tục...")
            continue

    # Nếu vẫn chưa đủ count do trần quá chặt, mở lỏng trần để lấp đầy
    if len(products) < count:
        print(f"\n   Mở lỏng trần để thu thập đủ {count} SP còn thiếu ({len(products)}/{count})...")
        for shard in LISTING_SHARDS:
            if len(products) >= count:
                break
            url = f"{BASE_URL}/listings/metadata/listings_{shard}.json.gz"
            try:
                with urlopen(request(url), timeout=60) as response:
                    with gzip.GzipFile(fileobj=response) as compressed:
                        with io.TextIOWrapper(compressed, encoding="utf-8") as lines:
                            for line in lines:
                                if not line.strip():
                                    continue
                                try:
                                    prod = json.loads(line)
                                except json.JSONDecodeError:
                                    continue
                                image_id = prod.get("main_image_id")
                                item_id = prod.get("item_id")
                                if not isinstance(image_id, str) or not isinstance(item_id, str):
                                    continue
                                key = (item_id, prod.get("domain_name"))
                                if key in seen:
                                    continue
                                seen.add(key)
                                prod["sync_index"] = len(products) + 1
                                prod["source_shard"] = shard
                                products.append(prod)
                                if len(products) >= count:
                                    break
            except Exception:
                continue

    render_progress_bar(len(products), count, prefix="   Tiến độ thu thập", suffix="[Hoàn tất]")
    print(f"   ✓ Đã thu thập thành công {len(products)} sản phẩm cân bằng danh mục!")
    return products


def read_image_paths(image_ids: set[str]) -> dict[str, str]:
    paths = {}
    remaining = set(image_ids)
    total_needed = len(image_ids)

    print(f"\n[2/3] Tra cứu đường dẫn ảnh từ catalog ({total_needed} ảnh)...")

    with urlopen(request(IMAGE_CATALOG_URL), timeout=60) as response:
        with gzip.GzipFile(fileobj=response) as compressed:
            with io.TextIOWrapper(compressed, encoding="utf-8", newline="") as text:
                for row in csv.DictReader(text):
                    image_id = row.get("image_id")
                    if image_id not in remaining:
                        continue
                    path = row.get("path")
                    if path:
                        paths[image_id] = path
                        remaining.remove(image_id)
                    if len(paths) % 200 == 0 or not remaining:
                        render_progress_bar(
                            len(paths),
                            total_needed,
                            prefix="   Ánh xạ ảnh S3",
                            suffix=f"Còn lại: {len(remaining)}",
                        )
                    if not remaining:
                        break

    print(f"   ✓ Đã ánh xạ {len(paths)}/{total_needed} ảnh thành công.")
    return paths


def download_image(relative_path: str, destination: Path) -> str:
    """Download single image file."""
    if destination.exists() and destination.stat().st_size > 0:
        return "skipped"

    url = f"{BASE_URL}/images/small/{quote(relative_path, safe='/')}"
    destination.parent.mkdir(parents=True, exist_ok=True)
    temp_path = destination.with_name(destination.name + ".part")

    for attempt in range(MAX_ATTEMPTS):
        try:
            with urlopen(request(url), timeout=40) as resp:
                with temp_path.open("wb") as out:
                    shutil.copyfileobj(resp, out)
            if temp_path.stat().st_size > 0:
                temp_path.replace(destination)
                return "downloaded"
            temp_path.unlink(missing_ok=True)
        except Exception:
            temp_path.unlink(missing_ok=True)
            if attempt + 1 == MAX_ATTEMPTS:
                raise
            time.sleep(1)
    return "failed"


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--count", type=int, default=5000, help="Số lượng SP cần lấy (mặc định: 5000)")
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("data/abo_dataset"),
        help="Thư mục lưu dữ liệu (mặc định: data/abo_dataset)",
    )
    parser.add_argument(
        "--no-images",
        action="store_true",
        help="CHỈ lưu metadata & S3 URL, KHÔNG tải ảnh về đĩa (siêu nhanh trong 30s, không tốn ổ cứng Colab)",
    )
    parser.add_argument(
        "--workers",
        type=int,
        default=16,
        help="Số luồng tải ảnh nếu không dùng --no-images (mặc định: 16)",
    )
    args = parser.parse_args()

    output_dir = args.output.resolve()
    output_dir.mkdir(parents=True, exist_ok=True)

    start_time = time.time()
    print("=" * 70)
    print("BẮT ĐẦU THU THẬP BỘ DỮ LIỆU CÂN BẰNG DANH MỤC (5.000 SP)")
    print(f" - Số lượng mục tiêu : {args.count} sản phẩm")
    print(f" - Thư mục lưu trữ   : {output_dir}")
    print(f" - Chế độ tải ảnh    : {'Chỉ lấy S3 URL (không tải đĩa)' if args.no_images else 'Tải ảnh về đĩa'}")
    print("=" * 70)

    # 1. Thu thập sản phẩm cân bằng
    products = read_balanced_products(args.count)

    # 2. Tra cứu đường dẫn ảnh & Gắn S3 URL
    image_ids = {p["main_image_id"] for p in products}
    image_paths = read_image_paths(image_ids)

    valid_products = []
    downloads = {}
    img_dir = output_dir / "images"

    for p in products:
        img_id = p["main_image_id"]
        rel_path = image_paths.get(img_id)
        if not rel_path:
            continue
        p["local_image_path"] = PurePosixPath("images", rel_path).as_posix()
        p["s3_image_url"] = f"{BASE_URL}/images/small/{quote(rel_path, safe='/')}"
        valid_products.append(p)
        downloads[rel_path] = img_dir.joinpath(*PurePosixPath(rel_path).parts)

    # Đánh lại sync_index từ 1 đến N
    for idx, p in enumerate(valid_products, start=1):
        p["sync_index"] = idx

    # 3. Tải ảnh nếu người dùng muốn lưu ảnh cục bộ
    if not args.no_images:
        img_dir.mkdir(parents=True, exist_ok=True)
        print(f"\n[3/3] Đang tải {len(downloads)} hình ảnh ({args.workers} luồng)...")
        completed = 0
        total_img = len(downloads)
        lock = threading.Lock()

        def worker(rel_path: str, dest: Path) -> None:
            nonlocal completed
            try:
                download_image(rel_path, dest)
            except Exception:
                pass
            with lock:
                completed += 1
                if completed % 50 == 0 or completed == total_img:
                    render_progress_bar(completed, total_img, prefix="   Tải ảnh về đĩa")

        with ThreadPoolExecutor(max_workers=args.workers) as pool:
            futures = [pool.submit(worker, r, d) for r, d in downloads.items()]
            for _ in as_completed(futures):
                pass
    else:
        print("\n[3/3] Bỏ qua bước tải ảnh về đĩa (--no-images). Toàn bộ ảnh sẽ được tải từ link S3!")

    # 4. Ghi file products.json
    products_file = output_dir / "products.json"
    products_file.write_text(json.dumps(valid_products, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    attribution = (
        "Dataset: Amazon Berkeley Objects (ABO)\n"
        "License: CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/)\n"
        f"Sample size: {len(valid_products)} products category-balanced.\n"
    )
    (output_dir / "ATTRIBUTION.txt").write_text(attribution, encoding="utf-8")

    elapsed = time.time() - start_time
    print("\n" + "=" * 70)
    print("HOÀN TẤT THU THẬP BỘ DỮ LIỆU CÂN BẰNG:")
    print(f" - Tổng sản phẩm thu thập : {len(valid_products)} sản phẩm")
    print(f" - 100% có link S3 online : s3_image_url")
    print(f" - File lưu kết quả       : {products_file}")
    print(f" - Thời gian thực hiện    : {elapsed:.2f} giây")
    print("=" * 70)
    print(f"👉 Bây giờ bạn có thể chạy: python scripts/check_dataset.py --data-dir {args.output}")


if __name__ == "__main__":
    main()

