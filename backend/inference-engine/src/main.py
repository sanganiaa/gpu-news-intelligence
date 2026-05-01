import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Inference Engine")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

DEVICE = os.getenv("DEVICE", "cpu")  # mps | cuda | cpu

@app.on_event("startup")
async def load_model():
    # TODO: load FinBERT (ProsusAI/finbert) onto DEVICE via transformers pipeline
    # pipeline("text-classification", model="ProsusAI/finbert", device=DEVICE)
    print(f"Inference engine starting on device: {DEVICE}")

@app.get("/health")
def health():
    return {"status": "ok", "service": "inference-engine", "device": DEVICE}

# TODO: POST /inference/sentiment        - run FinBERT on preprocessed article text
# TODO: POST /inference/classify         - market event classification (earnings, FDA, macro)
# TODO: POST /inference/batch            - GPU-batched inference across multiple articles
# TODO: GET  /inference/benchmark        - GPU utilization, throughput, latency stats
