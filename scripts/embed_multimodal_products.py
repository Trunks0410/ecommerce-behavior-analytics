#!/usr/bin/env python3
"""Multimodal Product Embedding & Metric Normalization using Qwen3-VL.

Pipeline:
1. Đọc dữ liệu đồng bộ từ `download_abo_products.py` trong thư mục `data/`.
2. Kiểm tra tính hợp lệ của ảnh và chuẩn bị cặp (Text + Image).
3. Sử dụng `Qwen/Qwen3-VL-Embedding-2B` (tương thích GPU Google Colab T4 / A100 / CPU).
4. Chuẩn hóa toàn bộ vector sang metric chuẩn L2-normalized (Cosine / Inner Product space).
5. Xuất ma trận vector (`.npz`), catalog metadata (`.json`), và báo cáo thống kê độ đo (`metric_stats.json`).
6. Cung cấp sẵn cơ chế test tìm kiếm & xếp hạng với `Qwen3-VL-Reranker`.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
from pathlib import Path
from typing import Any

# Ensure UTF-8 output on Windows / Linux / Colab
if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass


def get_optimal_torch_dtype(device: str) -> Any:
    """Select optimal float precision based on GPU hardware (e.g. Colab T4 vs A100)."""
    import torch

    if device != "cuda":
        return torch.float32
    if torch.cuda.is_available() and torch.cuda.is_bf16_supported():
        return torch.bfloat16
    return torch.float16
    """Select optimal float precision based on GPU hardware (e.g. Colab T4 vs A100)."""
    if device != "cuda":
        return torch.float32
    if torch.cuda.is_available() and torch.cuda.is_bf16_supported():
        return torch.bfloat16
    return torch.float16


def get_product_title(product: dict[str, Any]) -> str:
    """Extract clean title or keywords from product metadata."""
    item_names = product.get("item_name", [])
    if isinstance(item_names, list):
        for entry in item_names:
            if isinstance(entry, dict) and entry.get("language_tag", "").startswith("en"):
                return entry.get("value", "").strip()
        if item_names and isinstance(item_names[0], dict):
            return item_names[0].get("value", "").strip()
    elif isinstance(item_names, str):
        return item_names.strip()

    keywords = product.get("item_keywords", [])
    if keywords and isinstance(keywords, list):
        clean_kw = [k.get("value", "").strip() if isinstance(k, dict) else str(k).strip() for k in keywords[:5]]
        return " ".join([k for k in clean_kw if k])

    return str(product.get("item_id", "Unknown Product"))


def is_valid_image(image_path: Path) -> bool:
    """Quickly verify that image file exists and is not corrupt."""
    if not image_path.is_file() or image_path.stat().st_size == 0:
        return False
    try:
        from PIL import Image

        with Image.open(image_path) as img:
            img.verify()
        return True
    except Exception:
        return False


def build_embeddings_and_metrics(
    data_dir: Path,
    output_dir: Path,
    model_name: str = "Qwen/Qwen3-VL-Embedding-2B",
    batch_size: int = 8,
    device: str | None = None,
) -> tuple[Any, list[dict[str, Any]], dict[str, Any]]:
    """Generate multimodal embeddings and compute standardized metric attributes."""
    # Tự động tạo các thư mục nếu chưa tồn tại
    data_dir = data_dir.resolve()
    output_dir = output_dir.resolve()
    data_dir.mkdir(parents=True, exist_ok=True)
    output_dir.mkdir(parents=True, exist_ok=True)

    products_file = data_dir / "products.json"
    if not products_file.exists():
        print(f"⚠️ [Thông báo] Đã tự động tạo thư mục: '{data_dir}'")
        print(f"⚠️ Chưa tìm thấy file '{products_file.name}' trong thư mục này.")
        print(f"👉 Vui lòng chạy download trước: python scripts/download_abo_products.py --output {data_dir}")
        return None, [], {}

    import numpy as np
    import torch
    from sentence_transformers import SentenceTransformer

    with products_file.open("r", encoding="utf-8") as f:
        products = json.load(f)

    print("=" * 70)
    print("BẮT ĐẦU CHUẨN HÓA VÀ VECTOR HÓA ĐA PHƯƠNG THỨC (MULTIMODAL)")
    print(f" - Tổng sản phẩm trong file: {len(products)}")
    print(f" - Thư mục dữ liệu gốc     : {data_dir.resolve()}")
    print(f" - Thư mục xuất vector     : {output_dir.resolve()}")
    print("=" * 70)

    if device is None:
        device = "cuda" if torch.cuda.is_available() else "cpu"

    dtype = get_optimal_torch_dtype(device)
    device_name = torch.cuda.get_device_name(0) if device == "cuda" else "CPU"
    print(f"🚀 Thiết bị: {device.upper()} ({device_name}) | Kiểu dữ liệu: {dtype}")

    # 1. Load model với SDPA Attention tăng tốc phần cứng
    print(f"\n[1/3] Đang nạp model: {model_name}...")
    model_kwargs = {"torch_dtype": dtype}
    if device == "cuda":
        model_kwargs["attn_implementation"] = "sdpa"

    embed_model = SentenceTransformer(
        model_name,
        device=device,
        model_kwargs=model_kwargs,
        trust_remote_code=True,
    )

    # 2. Chuẩn bị multimodal inputs
    print("\n[2/3] Kiểm tra tính hợp lệ của ảnh và dữ liệu text...")
    valid_records: list[dict[str, Any]] = []
    inputs_to_embed: list[dict[str, Any]] = []
    corrupt_count = 0

    for p in products:
        item_id = p.get("item_id")
        title = get_product_title(p)
        rel_img_path = p.get("local_image_path")
        s3_url = p.get("s3_image_url")

        # Xác định nguồn ảnh: Ưu tiên ảnh cục bộ trên đĩa, nếu không có/không tải thì dùng S3 URL trực tiếp
        img_source: str | None = None
        if rel_img_path:
            full_img_path = data_dir / rel_img_path
            if is_valid_image(full_img_path):
                img_source = str(full_img_path.resolve())

        if not img_source and s3_url:
            img_source = s3_url
        elif not img_source and rel_img_path:
            clean_sub = rel_img_path.replace("images/", "").replace("images\\", "")
            img_source = f"https://amazon-berkeley-objects.s3.amazonaws.com/images/small/{clean_sub}"

        if not img_source:
            corrupt_count += 1
            continue

        valid_records.append(
            {
                "sync_index": p.get("sync_index"),
                "item_id": item_id,
                "title": title,
                "domain_name": p.get("domain_name"),
                "source_shard": p.get("source_shard", "unknown"),
                "s3_image_url": s3_url or img_source,
                "image_path": img_source,
                "relative_image_path": rel_img_path,
                "metric_type": "cosine",
            }
        )
        inputs_to_embed.append({"text": title, "image": img_source})

    if corrupt_count > 0:
        print(f"   ⚠️ Đã bỏ qua {corrupt_count} ảnh lỗi hoặc không tồn tại.")
    print(f"   ✓ Sẵn sàng vector hóa {len(inputs_to_embed)} sản phẩm hoàn chỉnh.")

    # 3. Tính toán embeddings & Chuẩn hóa Metric
    print(f"\n[3/3] Đang mã hóa vector đa phương thức (Batch size: {batch_size})...")
    start_time = time.time()

    raw_embeddings = embed_model.encode(
        inputs_to_embed,
        batch_size=batch_size,
        show_progress_bar=True,
        convert_to_numpy=True,
        normalize_embeddings=True,  # Chuẩn hóa L2: ||v|| = 1.0 (chuẩn hóa sang Metric Cosine Space)
    )

    elapsed = time.time() - start_time
    total_items, vector_dim = raw_embeddings.shape

    # Kiểm tra độ dài vector (L2 norm)
    norms = np.linalg.norm(raw_embeddings, axis=1)
    mean_norm = float(np.mean(norms))

    # Tính toán chỉ số thống kê độ đa dạng dữ liệu (Sample pairwise similarity metric)
    sample_size = min(total_items, 100)
    sample_sub = raw_embeddings[:sample_size]
    sim_matrix = np.dot(sample_sub, sample_sub.T)
    # Lấy các phần tử ngoài đường chéo chính
    diag_mask = ~np.eye(sample_size, dtype=bool)
    off_diag_sims = sim_matrix[diag_mask]

    similarity_stats = {
        "mean_similarity": float(np.mean(off_diag_sims)) if len(off_diag_sims) > 0 else 0.0,
        "std_similarity": float(np.std(off_diag_sims)) if len(off_diag_sims) > 0 else 0.0,
        "min_similarity": float(np.min(off_diag_sims)) if len(off_diag_sims) > 0 else 0.0,
        "max_similarity": float(np.max(off_diag_sims)) if len(off_diag_sims) > 0 else 0.0,
    }

    # Cập nhật thông tin metric vào từng record
    for idx, rec in enumerate(valid_records):
        rec["vector_dim"] = int(vector_dim)
        rec["l2_norm"] = round(float(norms[idx]), 6)

    # Tổng hợp metrics report
    metrics_report = {
        "dataset_name": "Amazon Berkeley Objects (ABO) Multimodal Index",
        "model_name": model_name,
        "device": f"{device.upper()} ({device_name})",
        "precision": str(dtype),
        "total_records": total_items,
        "vector_dimension": vector_dim,
        "metric_space": "Cosine Distance / L2-Normalized Inner Product",
        "average_l2_norm": round(mean_norm, 6),
        "embedding_time_seconds": round(elapsed, 2),
        "records_per_second": round(total_items / max(elapsed, 0.001), 2),
        "diversity_metric_sample": similarity_stats,
    }

    # 4. Lưu dữ liệu
    output_dir.mkdir(parents=True, exist_ok=True)
    embeddings_file = output_dir / "product_embeddings.npz"
    metadata_file = output_dir / "product_metadata.json"
    metrics_file = output_dir / "metric_stats.json"

    np.savez_compressed(embeddings_file, embeddings=raw_embeddings)
    with metadata_file.open("w", encoding="utf-8") as f:
        json.dump(valid_records, f, ensure_ascii=False, indent=2)
    with metrics_file.open("w", encoding="utf-8") as f:
        json.dump(metrics_report, f, ensure_ascii=False, indent=2)

    print("\n" + "=" * 70)
    print("HOÀN TẤT CHUẨN HÓA SANG METRIC THÀNH CÔNG:")
    print(f" - Tổng vector đã xuất     : {total_items} vectors (chiều: {vector_dim})")
    print(f" - Chuẩn L2 vector         : {mean_norm:.4f} (chuẩn hóa Cosine hoàn hảo)")
    print(f" - File ma trận vector     : {embeddings_file}")
    print(f" - File catalog metadata   : {metadata_file}")
    print(f" - Báo cáo chỉ số metric   : {metrics_file}")
    print(f" - Thời gian thực hiện     : {elapsed:.2f}s ({metrics_report['records_per_second']} items/s)")
    print("=" * 70)

    return raw_embeddings, valid_records, metrics_report


def run_test_search(
    query: str,
    output_dir: Path,
    top_k: int = 5,
    recall_k: int = 20,
    embed_model_name: str = "Qwen/Qwen3-VL-Embedding-2B",
    rerank_model_name: str = "Qwen/Qwen3-VL-Reranker-2B",
    device: str | None = None,
) -> None:
    """Test 2-stage search pipeline using Cosine Dot Product + Qwen3-VL-Reranker."""
    import numpy as np
    import torch
    from sentence_transformers import CrossEncoder, SentenceTransformer

    if device is None:
        device = "cuda" if torch.cuda.is_available() else "cpu"

    output_dir = output_dir.resolve()
    output_dir.mkdir(parents=True, exist_ok=True)

    embeddings_file = output_dir / "product_embeddings.npz"
    metadata_file = output_dir / "product_metadata.json"

    if not embeddings_file.exists() or not metadata_file.exists():
        print(f"⚠️ [Thông báo] Đã tự động tạo thư mục: '{output_dir}'")
        print(f"⚠️ Chưa tìm thấy file index '{embeddings_file.name}' hoặc '{metadata_file.name}' để tìm kiếm.")
        print("👉 Vui lòng chạy bước tạo embedding trước khi thử nghiệm tìm kiếm.")
        return

    embeddings = np.load(embeddings_file)["embeddings"]
    with metadata_file.open("r", encoding="utf-8") as f:
        metadata = json.load(f)

    print(f"\n[Stage 1] Tìm kiếm sơ bộ với Cosine Metric: '{query}'...")
    embed_model = SentenceTransformer(embed_model_name, device=device, trust_remote_code=True)
    q_vec = embed_model.encode([query], convert_to_numpy=True, normalize_embeddings=True)[0]

    # Tính Cosine similarity bằng tích vô hướng do cả hai đã chuẩn hóa L2
    cos_scores = np.dot(embeddings, q_vec)
    top_idx = np.argsort(cos_scores)[::-1][:recall_k]

    print(f"[Stage 2] Đang xếp hạng chính xác Top {recall_k} bằng {rerank_model_name}...")
    reranker = CrossEncoder(rerank_model_name, device=device, trust_remote_code=True)

    candidates = []
    selected_items = []
    for i in top_idx:
        item = metadata[i]
        selected_items.append(item)
        candidates.append({"text": item["title"], "image": item["image_path"]})

    scores = reranker.predict([(query, c) for c in candidates])
    final_order = np.argsort(scores)[::-1][:top_k]

    print("\n" + "=" * 75)
    print(f"KẾT QUẢ TOP {top_k} CHO TRUY VẤN: \"{query}\"")
    print("=" * 75)
    for rank, idx in enumerate(final_order, start=1):
        item = selected_items[idx]
        sc = float(scores[idx])
        print(f"#{rank} [Rerank Score: {sc:.4f}] - Item: {item['item_id']} ({item['source_shard']})")
        print(f"    Tên : {item['title']}")
        print(f"    Ảnh : {item['relative_image_path']}")
        print("-" * 75)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--data-dir",
        type=Path,
        default=Path("data/abo_dataset"),
        help="Thư mục chứa dữ liệu download (mặc định: data/abo_dataset)",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path("data/multimodal_embeddings"),
        help="Thư mục lưu vector index (mặc định: data/multimodal_embeddings)",
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=8,
        help="Batch size (mặc định: 8; trên Colab GPU T4 khuyến nghị 8 hoặc 16)",
    )
    parser.add_argument(
        "--test-query",
        type=str,
        default=None,
        help="Thực hiện test tìm kiếm thử với câu query sau khi embed",
    )
    args = parser.parse_args()

    # 1. Chạy quá trình embed và metric hóa
    embeddings, records, _ = build_embeddings_and_metrics(
        data_dir=args.data_dir,
        output_dir=args.output_dir,
        batch_size=args.batch_size,
    )

    if embeddings is None or len(records) == 0:
        return

    # 2. Test truy vấn nếu được chỉ định
    if args.test_query:
        run_test_search(
            query=args.test_query,
            output_dir=args.output_dir,
            top_k=5,
        )


if __name__ == "__main__":
    main()
