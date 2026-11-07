#!/usr/bin/env python3
"""Clean up and reset data directories for ABO dataset & embeddings.

Script an toàn để dọn dẹp dữ liệu cũ trước khi tải đợt mới:
- Xóa thư mục dữ liệu cũ (`data/abo_dataset`, `data/multimodal_embeddings`, `data/abo_500_products`...).
- Hỗ trợ cờ `--yes` / `-y` để chạy mượt mà không cần bấm xác nhận trên Google Colab.
- Báo cáo chính xác dung lượng đĩa đã được giải phóng.
- Tự động tạo lại thư mục `data/` sạch sẽ sẵn sàng cho quá trình tải mới.
"""

from __future__ import annotations

import argparse
import os
import shutil
import sys
from pathlib import Path

# Đảm bảo in tiếng Việt chuẩn
if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass


def format_bytes(size: int) -> str:
    """Format file size in human-readable units."""
    for unit in ["B", "KB", "MB", "GB"]:
        if size < 1024.0:
            return f"{size:.2f} {unit}"
        size /= 1024.0
    return f"{size:.2f} TB"


def get_dir_size(path: Path) -> int:
    """Calculate total size of directory or file in bytes."""
    if not path.exists():
        return 0
    if path.is_file():
        return path.stat().st_size
    total = 0
    for root, _, files in os.walk(path):
        for f in files:
            fp = os.path.join(root, f)
            try:
                total += os.path.getsize(fp)
            except OSError:
                pass
    return total


def clear_directory(target_path: Path) -> int:
    """Recursively delete a directory or file and return freed bytes."""
    if not target_path.exists():
        return 0
    size = get_dir_size(target_path)
    if target_path.is_file():
        target_path.unlink(missing_ok=True)
    else:
        shutil.rmtree(target_path, ignore_errors=True)
    return size


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--target",
        type=str,
        default="dataset",
        choices=["dataset", "embeddings", "all", "all-data"],
        help=(
            "Mục tiêu cần dọn dẹp: "
            "'dataset' (xóa data/abo_dataset), "
            "'embeddings' (xóa data/multimodal_embeddings), "
            "'all-data' (xóa toàn bộ file và thư mục trong data/)"
        ),
    )
    parser.add_argument(
        "--dir",
        type=Path,
        default=Path("data"),
        help="Thư mục data gốc (mặc định: data/)",
    )
    parser.add_argument(
        "-y",
        "--yes",
        action="store_true",
        help="Bỏ qua bước hỏi xác nhận (khuyên dùng khi chạy trên Google Colab)",
    )
    args = parser.parse_args()

    base_dir = args.dir.resolve()
    print("=" * 65)
    print("DỌN DẸP VÀ LÀM SẠCH DỮ LIỆU (CLEAN DATA TOOL)")
    print(f" - Thư mục gốc      : {base_dir}")
    print(f" - Chế độ dọn dẹp   : {args.target}")
    print("=" * 65)

    if not base_dir.exists():
        print(f"ℹ️ Thư mục '{base_dir}' chưa tồn tại. Đã tạo mới thư mục rỗng.")
        base_dir.mkdir(parents=True, exist_ok=True)
        return

    # Xác định các mục cần xóa
    paths_to_delete: list[Path] = []
    if args.target == "dataset":
        paths_to_delete.append(base_dir / "abo_dataset")
    elif args.target == "embeddings":
        paths_to_delete.append(base_dir / "multimodal_embeddings")
    elif args.target in ("all", "all-data"):
        for item in base_dir.iterdir():
            paths_to_delete.append(item)

    existing_targets = [p for p in paths_to_delete if p.exists()]
    if not existing_targets:
        print("✓ Không có dữ liệu cũ nào cần xóa. Thư mục đã sạch sẽ!")
        return

    # Tính tổng dung lượng cần dọn dẹp
    total_bytes = sum(get_dir_size(p) for p in existing_targets)
    print(f"\nTìm thấy {len(existing_targets)} mục cần xóa (Tổng dung lượng: {format_bytes(total_bytes)}):")
    for p in existing_targets:
        sz = format_bytes(get_dir_size(p))
        print(f"  • {p.name} ({sz})")

    # Xác nhận xóa nếu không có cờ -y
    if not args.yes:
        try:
            confirm = input("\n⚠️ Bạn có chắc chắn muốn xóa vĩnh viễn các mục trên? (y/N): ").strip().lower()
            if confirm not in ("y", "yes"):
                print("Đã hủy thao tác dọn dẹp.")
                return
        except (KeyboardInterrupt, EOFError):
            print("\nĐã hủy.")
            return

    # Tiến hành xóa
    freed_bytes = 0
    for p in existing_targets:
        freed_bytes += clear_directory(p)
        print(f"  🗑️ Đã xóa: {p.name}")

    # Tạo lại thư mục data sạch
    base_dir.mkdir(parents=True, exist_ok=True)

    print("\n" + "=" * 65)
    print("HOÀN TẤT DỌN DẸP DỮ LIỆU:")
    print(f" - Dung lượng đã giải phóng: {format_bytes(freed_bytes)}")
    print(f" - Thư mục '{base_dir.name}/' đã được làm sạch và sẵn sàng cho lần tải mới.")
    print("=" * 65)


if __name__ == "__main__":
    main()

