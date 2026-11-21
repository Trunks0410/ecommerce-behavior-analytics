import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
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
