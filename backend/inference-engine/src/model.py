"""
FinBERT inference via HuggingFace Inference API.
No local GPU or model weights required — authenticates with HF_TOKEN.
"""

import os
import time
import httpx

HF_TOKEN = os.getenv("HF_TOKEN", "")
MODEL_NAME = os.getenv("MODEL_NAME", "ProsusAI/finbert")
_HF_API_URL = f"https://router.huggingface.co/hf-inference/models/{MODEL_NAME}"
BATCH_SIZE = int(os.getenv("BATCH_SIZE", "32"))

_initialized = False
_load_time_ms: float = 0.0

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


def load_model() -> None:
    global _initialized, _load_time_ms
    if not HF_TOKEN:
        raise RuntimeError("HF_TOKEN environment variable is not set")
    _initialized = True
    _load_time_ms = 0.0
    print(f"[Inference] Using HuggingFace Inference API for {MODEL_NAME}")


def is_loaded() -> bool:
    return _initialized


def get_device_str() -> str:
    return "huggingface-api"


def get_load_time_ms() -> float:
    return _load_time_ms


def _hf_post(payload: dict, max_retries: int = 3) -> list:
    headers = {"Authorization": f"Bearer {HF_TOKEN}"}
    for attempt in range(max_retries):
        with httpx.Client(timeout=60.0) as client:
            resp = client.post(_HF_API_URL, json=payload, headers=headers)
        if resp.status_code == 200:
            return resp.json()
        if resp.status_code == 503:
            # Model is cold-starting on HF free tier — wait then retry
            try:
                wait = min(float(resp.json().get("estimated_time", 30)), 30.0)
            except Exception:
                wait = 30.0
            print(f"[Inference] Model loading on HF, waiting {wait:.0f}s (attempt {attempt + 1}/{max_retries})")
            time.sleep(wait)
            continue
        resp.raise_for_status()
    raise RuntimeError(f"HuggingFace Inference API failed after {max_retries} retries")


def _parse_results(raw: list[dict]) -> tuple[str, float, dict[str, float]]:
    """Convert a single API output list into (label, confidence, probs)."""
    probs = {r["label"].lower(): round(r["score"], 6) for r in raw}
    label = max(probs, key=probs.get)
    return label, probs[label], {
        "positive": probs.get("positive", 0.0),
        "negative": probs.get("negative", 0.0),
        "neutral":  probs.get("neutral",  0.0),
    }


def infer_single(text: str) -> dict:
    if not is_loaded():
        raise RuntimeError("Model not loaded — call load_model() first")

    t0 = time.time()
    raw = _hf_post({"inputs": text})
    latency_ms = (time.time() - t0) * 1000

    # API may wrap single-input response in an outer list
    if raw and isinstance(raw[0], list):
        raw = raw[0]

    label, confidence, probs = _parse_results(raw)
    return {
        "sentiment": label,
        "confidence": round(confidence, 6),
        "probabilities": probs,
        "latency_ms": round(latency_ms, 2),
    }


def infer_batch(texts: list[str]) -> tuple[list[dict], float]:
    if not is_loaded():
        raise RuntimeError("Model not loaded — call load_model() first")

    t0 = time.time()
    raw_batch = _hf_post({"inputs": texts})
    total_ms = (time.time() - t0) * 1000

    per_item_ms = round(total_ms / max(len(texts), 1), 2)
    results = []
    for raw in raw_batch:
        if raw and isinstance(raw[0], list):
            raw = raw[0]
        label, confidence, probs = _parse_results(raw)
        results.append({
            "sentiment": label,
            "confidence": round(confidence, 6),
            "probabilities": probs,
            "latency_ms": per_item_ms,
        })
    return results, round(total_ms, 2)


def run_benchmark(warmup: int = 2, timed: int = 5) -> dict:
    import statistics

    if not is_loaded():
        raise RuntimeError("Model not loaded — call load_model() first")

    # Fill a batch-sized list by cycling the benchmark sentences
    texts = (_BENCH_SENTENCES * ((BATCH_SIZE // len(_BENCH_SENTENCES)) + 1))[:BATCH_SIZE]

    for _ in range(warmup):
        _hf_post({"inputs": texts})

    latencies_ms: list[float] = []
    for _ in range(timed):
        t0 = time.time()
        _hf_post({"inputs": texts})
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
