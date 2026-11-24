import base64
import io
import os
from contextlib import asynccontextmanager
from typing import Optional
# pyrefly: ignore[missing-import]
from fastapi import FastAPI, HTTPException
# pyrefly: ignore[missing-import]
from PIL import Image
# pyrefly: ignore[missing-import]
from pydantic import BaseModel
# pyrefly: ignore[missing-import]
import torch
# pyrefly: ignore[missing-import]
from sentence_transformers import SentenceTransformer

MODEL_NAME = os.getenv("MODEL_NAME", "Qwen/Qwen3-VL-Embedding-2B")
HAS_CUDA = torch.cuda.is_available()
DEVICE = "cuda" if HAS_CUDA else "cpu"
CPU_THREADS = int(os.getenv("CPU_THREADS", "4"))
GPU_MAX_MEMORY = os.getenv("GPU_MAX_MEMORY", "4200MiB")
CPU_MAX_MEMORY = os.getenv("CPU_MAX_MEMORY", "8GiB")
MAX_IMAGE_SIDE = int(os.getenv("MAX_IMAGE_SIDE", "1024"))

torch.set_num_threads(CPU_THREADS)
embed_model = None
load_mode = "uninitialized"


def _load_model():
    global load_mode
    dtype = (
        torch.bfloat16
        if (HAS_CUDA and torch.cuda.is_bf16_supported())
        else (torch.float16 if HAS_CUDA else torch.float32)
    )

    if HAS_CUDA:
        # Chế độ Hybrid GPU + CPU: giữ VRAM trong ngưỡng an toàn cho RTX 3050 6GB, phần dư offload sang CPU RAM
        try:
            print(
                f"Loading {MODEL_NAME} in HYBRID GPU+CPU mode "
                f"(dtype={dtype}, max_gpu={GPU_MAX_MEMORY}, max_cpu={CPU_MAX_MEMORY}, cpu_threads={CPU_THREADS})..."
            )
            model = SentenceTransformer(
                MODEL_NAME,
                trust_remote_code=True,
                model_kwargs={
                    "torch_dtype": dtype,
                    "device_map": "auto",
                    "max_memory": {0: GPU_MAX_MEMORY, "cpu": CPU_MAX_MEMORY},
                    "low_cpu_mem_usage": True,
                },
            )
            load_mode = "hybrid-gpu-cpu"
            return model
        except Exception as hybrid_exc:
            print(f"Hybrid device_map fallback to single GPU/CPU due to: {hybrid_exc}")

    print(f"Loading {MODEL_NAME} on {DEVICE} ({dtype}, cpu_threads={CPU_THREADS})...")
    load_mode = f"single-{DEVICE}"
    return SentenceTransformer(
        MODEL_NAME,
        device=DEVICE,
        trust_remote_code=True,
        model_kwargs={"torch_dtype": dtype, "low_cpu_mem_usage": True},
    )


@asynccontextmanager
async def lifespan(app: FastAPI):
    global embed_model
    embed_model = _load_model()
    print(f"Model {MODEL_NAME} ready ({load_mode}).")
    yield


app = FastAPI(title="Qwen3-VL Embedding Inference Service", lifespan=lifespan)


class EmbedRequest(BaseModel):
    text: str


class EmbedImageRequest(BaseModel):
    imageBase64: str
    text: Optional[str] = None


@app.get("/health")
def health():
    vram_mb = round(torch.cuda.memory_allocated(0) / (1024 * 1024), 1) if HAS_CUDA else 0.0
    return {
        "status": "UP" if embed_model is not None else "LOADING",
        "model": MODEL_NAME,
        "device": DEVICE,
        "mode": load_mode,
        "vram_allocated_mb": vram_mb,
        "cpu_threads": CPU_THREADS,
    }


@app.post("/embed")
def embed(req: EmbedRequest):
    if embed_model is None:
        raise HTTPException(status_code=503, detail="Model is still loading")
    clean = (req.text or "").strip()
    if not clean:
        raise HTTPException(status_code=400, detail="text is required")

    with torch.inference_mode():
        vec = embed_model.encode(
            [{"text": clean}],
            convert_to_numpy=True,
            normalize_embeddings=True,
        )[0]
    return {"vector": vec.tolist(), "dim": int(len(vec))}


@app.post("/embed-image")
def embed_image(req: EmbedImageRequest):
    if embed_model is None:
        raise HTTPException(status_code=503, detail="Model is still loading")
    raw_b64 = (req.imageBase64 or "").strip()
    if not raw_b64:
        raise HTTPException(status_code=400, detail="imageBase64 is required")
    if "," in raw_b64 and raw_b64.startswith("data:"):
        raw_b64 = raw_b64.split(",", 1)[1]

    try:
        img_bytes = base64.b64decode(raw_b64)
        img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
        if max(img.size) > MAX_IMAGE_SIDE:
            img.thumbnail((MAX_IMAGE_SIDE, MAX_IMAGE_SIDE), Image.Resampling.LANCZOS)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Invalid imageBase64: {exc}")

    payload = {"image": img}
    if req.text and req.text.strip():
        payload["text"] = req.text.strip()

    with torch.inference_mode():
        vec = embed_model.encode(
            [payload],
            convert_to_numpy=True,
            normalize_embeddings=True,
        )[0]
    return {"vector": vec.tolist(), "dim": int(len(vec))}
