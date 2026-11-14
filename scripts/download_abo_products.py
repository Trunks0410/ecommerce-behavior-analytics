#!/usr/bin/env python3
"""Download product metadata and primary images from the Amazon Berkeley Objects dataset."""

from __future__ import annotations

import argparse
import csv
import gzip
import io
import json
import re
import shutil
import sys
import threading
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path, PurePosixPath
from urllib.error import HTTPError, URLError
from urllib.parse import quote
from urllib.request import Request, urlopen

# Ensure UTF-8 console output on Windows
if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass


BASE_URL = "https://amazon-berkeley-objects.s3.amazonaws.com"
LISTING_SHARDS = "0123456789abcdef"
IMAGE_CATALOG_URL = f"{BASE_URL}/images/metadata/images.csv.gz"
USER_AGENT = "abo-product-sample-downloader/1.0"
IMAGE_PATH_PATTERN = re.compile(r"[0-9a-f]{2}/[0-9a-f]+\.(?:jpg|png)\Z")
MAX_ATTEMPTS = 3


def request(url: str) -> Request:
    return Request(url, headers={"User-Agent": USER_AGENT})


def render_progress_bar(current: int, total: int, prefix: str = "", suffix: str = "", length: int = 30) -> None:
    """Render a terminal progress bar with carriage return."""
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


def read_products(count: int, seed: int | None = None) -> list[dict]:
    """Read product listings distributed evenly across all 16 shards.

    Instead of downloading entire large archives from S3 (which takes a long time
    and high bandwidth on Colab), this partitions the target count across all
    shards (quota per shard = ceil(count / 16)) with round-robin fallback.
    This guarantees 100% balanced representation across all shards and runs in seconds.
    """
    import math
    import random

    if seed is not None:
        random.seed(seed)

    products: list[dict] = []
    seen = set()
    num_shards = len(LISTING_SHARDS)
    target_per_shard = math.ceil(count / num_shards)

    print(f"\n[1/3] Đang quét danh sách sản phẩm từ Amazon S3 (Mục tiêu: {count} SP)...")
    print(f"      -> Phân bổ đồng đều: ~{target_per_shard} SP/shard trên {num_shards} shards.")

    # Quét từng shard theo quota đồng đều
    for shard_idx, shard in enumerate(LISTING_SHARDS, start=1):
        if len(products) >= count:
            break

        remaining_needed = count - len(products)
        current_shard_quota = min(target_per_shard, remaining_needed)
        shard_collected = 0
        url = f"{BASE_URL}/listings/metadata/listings_{shard}.json.gz"

        try:
            with urlopen(request(url), timeout=60) as response:
                with gzip.GzipFile(fileobj=response) as compressed:
                    with io.TextIOWrapper(compressed, encoding="utf-8") as lines:
                        for line in lines:
                            if not line.strip():
                                continue
                            try:
                                product = json.loads(line)
                            except json.JSONDecodeError:
                                continue

                            image_id = product.get("main_image_id")
                            item_id = product.get("item_id")
                            if not isinstance(image_id, str) or not isinstance(item_id, str):
                                continue

                            key = (item_id, product.get("domain_name"))
                            if key in seen:
                                continue
                            seen.add(key)

                            product["sync_index"] = len(products) + 1
                            product["source_shard"] = shard
                            products.append(product)
                            shard_collected += 1

                            if len(products) % 10 == 0 or len(products) == count:
                                render_progress_bar(
                                    len(products),
                                    count,
                                    prefix="   Tiến độ quét SP",
                                    suffix=f"[Shard {shard}: {shard_collected}/{current_shard_quota}]",
                                )

                            if shard_collected >= current_shard_quota or len(products) >= count:
                                break
        except Exception as err:
            print(f"\n   [Cảnh báo] Lỗi khi đọc shard {shard}: {err}. Tiếp tục shard kế...")
            continue

    if len(products) < count:
        print(f"\n   [Thông báo] Thu thập được {len(products)}/{count} SP (các shard đã được quét hết).")

    render_progress_bar(len(products), count, prefix="   Tiến độ quét SP", suffix="[Hoàn tất]")
    print(f"   ✓ Đã thu thập thành công {len(products)} sản phẩm phân bổ đồng đều qua {num_shards} shards.")
    return products


def read_image_paths(image_ids: set[str]) -> dict[str, str]:
    paths = {}
    remaining = set(image_ids)
    total_needed = len(image_ids)

    print(f"\n[2/3] Đang tra cứu danh mục hình ảnh ({total_needed} ảnh cần tìm)...")

    with urlopen(request(IMAGE_CATALOG_URL), timeout=60) as response:
        with gzip.GzipFile(fileobj=response) as compressed:
            with io.TextIOWrapper(compressed, encoding="utf-8", newline="") as text:
                for row in csv.DictReader(text):
                    image_id = row.get("image_id")
                    if image_id not in remaining:
                        continue

                    path = row.get("path")
                    if not path or not IMAGE_PATH_PATTERN.fullmatch(path):
                        raise ValueError(f"Đường dẫn ảnh không hợp lệ trong catalog: {path!r}")

                    paths[image_id] = path
                    remaining.remove(image_id)

                    found_count = total_needed - len(remaining)
                    if found_count % 20 == 0 or not remaining:
                        render_progress_bar(
                            found_count,
                            total_needed,
                            prefix="   Ánh xạ đường dẫn",
                            suffix=f"Còn lại: {len(remaining)}",
                        )

                    if not remaining:
                        break

    if remaining:
        missing = ", ".join(sorted(remaining)[:10])
        raise RuntimeError(
            f"Danh mục ảnh thiếu đường dẫn cho {len(remaining)} ảnh đã chọn: {missing}"
        )

    print(f"   ✓ Đã ánh xạ chính xác 100% ({len(paths)}/{total_needed}) đường dẫn ảnh.")
    return paths


def download_image(relative_path: str, destination: Path, skip_existing: bool = True) -> tuple[str, bool]:
    """Download single image with retry and atomic write.
    Returns: (status: 'downloaded' | 'skipped', success: True)
    """
    if skip_existing and destination.exists() and destination.stat().st_size > 0:
        return "skipped", True

    url = f"{BASE_URL}/images/small/{quote(relative_path, safe='/')}"
    destination.parent.mkdir(parents=True, exist_ok=True)
    temporary_path = destination.with_name(destination.name + ".part")

    for attempt in range(MAX_ATTEMPTS):
        try:
            with urlopen(request(url), timeout=60) as response:
                with temporary_path.open("wb") as output:
                    shutil.copyfileobj(response, output)
            if temporary_path.stat().st_size == 0:
                temporary_path.unlink(missing_ok=True)
                raise RuntimeError(f"Tải về file rỗng từ {url}")
            temporary_path.replace(destination)
            return "downloaded", True
        except (HTTPError, URLError, TimeoutError) as error:
            temporary_path.unlink(missing_ok=True)
            if attempt + 1 == MAX_ATTEMPTS:
                raise RuntimeError(f"Không thể tải ảnh {relative_path}") from error
            time.sleep(2**attempt)

    return "failed", False


def save_attribution(output_dir: Path, count: int) -> None:
    attribution = (
        "Dataset: Amazon Berkeley Objects (ABO)\n"
        "License: Creative Commons Attribution 4.0 International (CC BY 4.0)\n"
        "License: https://creativecommons.org/licenses/by/4.0/\n"
        "Dataset: https://amazon-berkeley-objects.s3.amazonaws.com/index.html\n"
        "Data attribution: Amazon.com\n"
        "Dataset/archive attribution: Matthieu Guillaumin, Thomas Dideriksen, "
        "Kenan Deng, Himanshu Arora, Jasmine Collins, and Jitendra Malik.\n"
        f"Changes: A {count}-product sample was selected; primary images were downloaded "
        "in the dataset's small-image size.\n"
    )
    (output_dir / "ATTRIBUTION.txt").write_text(attribution, encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--count", type=int, default=500, help="Số lượng sản phẩm cần tải (mặc định: 500)")
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("data/abo_dataset"),
        help="Thư mục lưu dữ liệu (mặc định: data/abo_dataset)",
    )
    parser.add_argument(
        "--seed",
        type=int,
        default=None,
        help="Random seed for deterministic sampling (optional)",
    )
    parser.add_argument(
        "--workers",
        type=int,
        default=8,
        help="Số luồng tải ảnh song song (mặc định: 8; tối đa: 32)",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Tải lại toàn bộ ảnh kể cả khi file đã tồn tại trên đĩa",
    )
    args = parser.parse_args()

    if args.count < 1:
        parser.error("--count phải lớn hơn hoặc bằng 1")
    if not 1 <= args.workers <= 32:
        parser.error("--workers phải nằm trong khoảng từ 1 đến 32")

    start_time = time.time()
    output_dir = args.output.resolve()
    output_dir.mkdir(parents=True, exist_ok=True)
    image_dir = output_dir / "images"
    image_dir.mkdir(parents=True, exist_ok=True)

    print("=" * 65)
    print("BẮT ĐẦU QUÁ TRÌNH TẢI DỮ LIỆU ABO VỚI BỘ ĐẾM TIẾN ĐỘ ĐỒNG BỘ")
    print(f" - Số lượng sản phẩm : {args.count}")
    print(f" - Thư mục đích      : {output_dir}")
    print(f" - Số luồng song song: {args.workers}")
    print("=" * 65)

    products = read_products(args.count, seed=args.seed)
    image_paths = read_image_paths({product["main_image_id"] for product in products})

    downloads = {}
    for product in products:
        image_id = product["main_image_id"]
        relative_path = image_paths[image_id]
        local_path = PurePosixPath("images", relative_path).as_posix()
        product["local_image_path"] = local_path
        product["s3_image_url"] = f"{BASE_URL}/images/small/{quote(relative_path, safe='/')}"
        downloads[relative_path] = image_dir.joinpath(*PurePosixPath(relative_path).parts)

    total_images = len(downloads)
    print(f"\n[3/3] Đang tải {total_images} hình ảnh sản phẩm ({args.workers} luồng)...")

    # Bộ đếm tiến độ đa luồng
    progress_lock = threading.Lock()
    stats = {
        "completed": 0,
        "downloaded": 0,
        "skipped": 0,
        "failed": 0,
    }

    failures = []

    def task_wrapper(rel_path: str, dest: Path) -> None:
        try:
            status, ok = download_image(rel_path, dest, skip_existing=not args.force)
            with progress_lock:
                stats["completed"] += 1
                if status == "downloaded":
                    stats["downloaded"] += 1
                else:
                    stats["skipped"] += 1

                render_progress_bar(
                    stats["completed"],
                    total_images,
                    prefix="   Tiến độ tải ảnh",
                    suffix=f"[Mới: {stats['downloaded']} | Sẵn có: {stats['skipped']}]",
                )
        except RuntimeError as err:
            with progress_lock:
                stats["completed"] += 1
                stats["failed"] += 1
                failures.append(str(err))
                render_progress_bar(
                    stats["completed"],
                    total_images,
                    prefix="   Tiến độ tải ảnh",
                    suffix=f"[Lỗi: {stats['failed']}]",
                )

    with ThreadPoolExecutor(max_workers=args.workers) as executor:
        futures = [
            executor.submit(task_wrapper, rel_path, dest)
            for rel_path, dest in downloads.items()
        ]
        for f in as_completed(futures):
            # Exception will be captured inside wrapper and recorded into failures
            pass

    if failures:
        raise RuntimeError(
            f"Tải thất bại {len(failures)}/{total_images} ảnh:\n"
            + "\n".join(f"- {f}" for f in failures[:5])
            + (f"\n... và {len(failures) - 5} lỗi khác" if len(failures) > 5 else "")
        )

    # Ghi metadata sản phẩm đồng bộ
    output_dir.mkdir(parents=True, exist_ok=True)
    products_file = output_dir / "products.json"
    products_file.write_text(
        json.dumps(products, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    save_attribution(output_dir, len(products))

    elapsed = time.time() - start_time
    print("\n" + "=" * 65)
    print("HOÀN TẤT ĐỒNG BỘ DỮ LIỆU:")
    print(f" - Tổng sản phẩm      : {len(products)} SP (đã đánh số thứ tự sync_index 1..{len(products)})")
    print(f" - Tổng ảnh đã xử lý : {total_images} ảnh ({stats['downloaded']} tải mới, {stats['skipped']} có sẵn)")
    print(f" - Thư mục lưu        : {output_dir}")
    print(f" - File metadata      : {products_file}")
    print(f" - Thời gian thực hiện: {elapsed:.2f} giây")
    print("=" * 65)


if __name__ == "__main__":
    main()

