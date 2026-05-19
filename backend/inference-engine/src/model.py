"""
FinBERT model loader and inference helpers.

Device priority (controlled by DEVICE env var):
  mps  → Apple Silicon GPU (M1/M2/M3)
  cuda → NVIDIA GPU
  cpu  → fallback
"""

import os
import time
import torch
from transformers import pipeline

MODEL_NAME = os.getenv("MODEL_NAME", "ProsusAI/finbert")
DEVICE_ENV = os.getenv("DEVICE", "cpu")
BATCH_SIZE = int(os.getenv("BATCH_SIZE", "32"))

_pipe = None
_device: torch.device | None = None
_load_time_ms: float = 0.0

# Synthetic finance sentences used for benchmark warmup/timing
_BENCH_SENTENCES = [
    "NVIDIA reports record quarterly revenue driven by AI chip demand.",
    "Federal Reserve signals potential rate cuts amid slowing inflation.",
    "Apple misses earnings estimates; shares fall in after-hours trading.",
    "FDA approves new cancer therapy developed by biotech startup.",
    "Amazon acquires logistics startup in a $2 billion deal.",
    "Strong job market data pushes Treasury yields higher.",
    "Tesla upgrades price target after analyst sees strong delivery numbers.",
    "SEC files charges against hedge fund for insider trading.",
]


def _resolve_device() -> torch.device:
    if DEVICE_ENV == "mps":
        if torch.backends.mps.is_available():
            return torch.device("mps")
        print("[Inference] MPS requested but not available — falling back to CPU")
    elif DEVICE_ENV == "cuda":
        if torch.cuda.is_available():
            return torch.device("cuda")
        print("[Inference] CUDA requested but not available — falling back to CPU")
    return torch.device("cpu")


def load_model() -> None:
    global _pipe, _device, _load_time_ms
    _device = _resolve_device()
    t0 = time.time()
    _pipe = pipeline(
        "text-classification",
        model=MODEL_NAME,
        tokenizer=MODEL_NAME,
        device=_device,
        top_k=None,       # return all label scores, not just the top one
        max_length=512,
        truncation=True,
    )
    _load_time_ms = (time.time() - t0) * 1000
    print(f"[Inference] {MODEL_NAME} loaded on {_device} in {_load_time_ms:.0f} ms")


def is_loaded() -> bool:
    return _pipe is not None


def get_device_str() -> str:
    return str(_device) if _device else DEVICE_ENV


def get_load_time_ms() -> float:
    return _load_time_ms


def _parse_results(raw: list[dict]) -> tuple[str, float, dict[str, float]]:
    """Convert a single pipeline output list into (label, confidence, probs)."""
    probs = {r["label"].lower(): round(r["score"], 6) for r in raw}
    label = max(probs, key=probs.get)
    return label, probs[label], {
        "positive": probs.get("positive", 0.0),
        "negative": probs.get("negative", 0.0),
        "neutral":  probs.get("neutral",  0.0),
    }


def infer_single(text: str) -> dict:
    """
    Run FinBERT on one text. Returns sentiment, confidence, probabilities,
    and wall-clock latency.
    """
    if not is_loaded():
        raise RuntimeError("Model not loaded — call load_model() first")

    t0 = time.time()
    raw = _pipe(text, max_length=512, truncation=True)
    latency_ms = (time.time() - t0) * 1000

    label, confidence, probs = _parse_results(raw)
    return {
        "sentiment": label,
        "confidence": round(confidence, 6),
        "probabilities": probs,
        "latency_ms": round(latency_ms, 2),
    }


def infer_batch(texts: list[str]) -> tuple[list[dict], float]:
    """
    Run FinBERT on a list of texts using GPU batching.
    Returns (list of result dicts, total_latency_ms).
    """
    if not is_loaded():
        raise RuntimeError("Model not loaded — call load_model() first")

    t0 = time.time()
    batch_raw = _pipe(texts, batch_size=BATCH_SIZE, max_length=512, truncation=True)
    total_ms = (time.time() - t0) * 1000

    per_item_ms = round(total_ms / max(len(texts), 1), 2)
    results = []
    for raw in batch_raw:
        label, confidence, probs = _parse_results(raw)
        results.append({
            "sentiment": label,
            "confidence": round(confidence, 6),
            "probabilities": probs,
            "latency_ms": per_item_ms,
        })
    return results, round(total_ms, 2)


def run_benchmark(warmup: int = 2, timed: int = 5) -> dict:
    """
    Warm up the model then time N batches over the benchmark sentences.
    Returns throughput and latency percentiles.
    """
    import statistics

    if not is_loaded():
        raise RuntimeError("Model not loaded — call load_model() first")

    texts = _BENCH_SENTENCES * BATCH_SIZE  # fill a full batch

    # Warmup passes (not timed)
    for _ in range(warmup):
        _pipe(texts[:BATCH_SIZE], batch_size=BATCH_SIZE, max_length=512, truncation=True)

    latencies_ms: list[float] = []
    for _ in range(timed):
        t0 = time.time()
        _pipe(texts[:BATCH_SIZE], batch_size=BATCH_SIZE, max_length=512, truncation=True)
        latencies_ms.append((time.time() - t0) * 1000)

    avg_ms = statistics.mean(latencies_ms)
    p50_ms = statistics.median(latencies_ms)
    p99_ms = sorted(latencies_ms)[int(len(latencies_ms) * 0.99)] if len(latencies_ms) > 1 else latencies_ms[-1]
    throughput = round(BATCH_SIZE / (avg_ms / 1000), 2)

    return {
        "device": get_device_str(),
        "model": MODEL_NAME,
        "batch_size": BATCH_SIZE,
        "warmup_runs": warmup,
        "timed_runs": timed,
        "avg_latency_ms": round(avg_ms, 2),
        "p50_latency_ms": round(p50_ms, 2),
        "p99_latency_ms": round(p99_ms, 2),
        "throughput_articles_per_sec": throughput,
        "total_articles_processed": BATCH_SIZE * timed,
    }
