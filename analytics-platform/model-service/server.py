import base64
import io
import os
from contextlib import asynccontextmanager
from typing import Optional
from fastapi import FastAPI, HTTPException
from PIL import Image
from pydantic import BaseModel
import torch
from sentence_transformers import SentenceTransformer

MODEL_NAME = os.getenv("MODEL_NAME", "Qwen/Qwen3-VL-Embedding-2B")
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
embed_model = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global embed_model
    dtype = torch.bfloat16 if (DEVICE == "cuda" and torch.cuda.is_bf16_supported()) else (
        torch.float16 if DEVICE == "cuda" else torch.float32
    )
    print(f"Loading {MODEL_NAME} on {DEVICE} ({dtype})...")
    embed_model = SentenceTransformer(
        MODEL_NAME,
        device=DEVICE,
        trust_remote_code=True,
        model_kwargs={"torch_dtype": dtype},
    )
    print(f"Model {MODEL_NAME} ready.")
    yield


app = FastAPI(title="Qwen3-VL Embedding Inference Service", lifespan=lifespan)


class EmbedRequest(BaseModel):
    text: str


class EmbedImageRequest(BaseModel):
    imageBase64: str
    text: Optional[str] = None


@app.get("/health")
def health():
    return {"status": "UP" if embed_model is not None else "LOADING", "model": MODEL_NAME, "device": DEVICE}


@app.post("/embed")
def embed(req: EmbedRequest):
    if embed_model is None:
        raise HTTPException(status_code=503, detail="Model is still loading")
    clean = (req.text or "").strip()
    if not clean:
        raise HTTPException(status_code=400, detail="text is required")

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
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Invalid imageBase64: {exc}")

    payload = {"image": img}
    if req.text and req.text.strip():
        payload["text"] = req.text.strip()

    vec = embed_model.encode(
        [payload],
        convert_to_numpy=True,
        normalize_embeddings=True,
    )[0]
    return {"vector": vec.tolist(), "dim": int(len(vec))}
