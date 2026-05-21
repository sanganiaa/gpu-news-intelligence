import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .model import load_model, infer_single, infer_batch, run_benchmark, get_device_str, is_loaded, get_load_time_ms
from .classifier import classify_event
from .schema import (
    SentimentRequest, SentimentResult, Probabilities,
    BatchSentimentRequest, BatchSentimentResponse,
    ClassifyRequest, ClassifyResult,
    BenchmarkResult,
)

DEVICE = os.getenv("DEVICE", "cpu")

app = FastAPI(title="Inference Engine", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    load_model()


# ── Health ────────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "inference-engine",
        "device": get_device_str(),
        "model_loaded": is_loaded(),
        "model_load_time_ms": get_load_time_ms(),
    }


# ── Sentiment ─────────────────────────────────────────────────────────────────

@app.post("/inference/sentiment", response_model=SentimentResult)
def sentiment(req: SentimentRequest):
    """
    Run FinBERT sentiment analysis on a single preprocessed article.
    Returns positive / negative / neutral with a confidence score.
    """
    if not is_loaded():
        raise HTTPException(status_code=503, detail="Model not loaded yet")

    text = (req.title + ". " + req.text) if req.title else req.text
    result = infer_single(text)

    return SentimentResult(
        id=req.id,
        ticker=req.ticker,
        content_type=req.content_type,
        sentiment=result["sentiment"],
        confidence=result["confidence"],
        probabilities=Probabilities(**result["probabilities"]),
        latency_ms=result["latency_ms"],
    )


# ── Batch ─────────────────────────────────────────────────────────────────────

@app.post("/inference/batch", response_model=BatchSentimentResponse)
def batch_inference(req: BatchSentimentRequest):
    """
    GPU-batched FinBERT inference across multiple articles.
    More efficient than calling /sentiment in a loop.
    """
    if not is_loaded():
        raise HTTPException(status_code=503, detail="Model not loaded yet")
    if not req.articles:
        raise HTTPException(status_code=422, detail="articles list is empty")

    texts = [
        (a.title + ". " + a.text) if a.title else a.text
        for a in req.articles
    ]
    raw_results, total_ms = infer_batch(texts)

    results = [
        SentimentResult(
            id=article.id,
            ticker=article.ticker,
            content_type=article.content_type,
            sentiment=r["sentiment"],
            confidence=r["confidence"],
            probabilities=Probabilities(**r["probabilities"]),
            latency_ms=r["latency_ms"],
        )
        for article, r in zip(req.articles, raw_results)
    ]

    n = len(req.articles)
    throughput = round(n / (total_ms / 1000), 2) if total_ms > 0 else 0.0

    return BatchSentimentResponse(
        results=results,
        total_articles=n,
        total_latency_ms=total_ms,
        throughput_articles_per_sec=throughput,
        device=get_device_str(),
    )


# ── Classify ──────────────────────────────────────────────────────────────────

@app.post("/inference/classify", response_model=ClassifyResult)
def classify(req: ClassifyRequest):
    """
    Run FinBERT sentiment + rule-based market event classification.
    Event types: earnings | fda | merger | analyst | filing | macro | other
    """
    if not is_loaded():
        raise HTTPException(status_code=503, detail="Model not loaded yet")

    text = (req.title + ". " + req.text) if req.title else req.text
    sentiment_result = infer_single(text)
    event_type, event_conf = classify_event(req.title, req.text)

    return ClassifyResult(
        id=req.id,
        ticker=req.ticker,
        content_type=req.content_type,
        event_type=event_type,
        event_confidence=event_conf,
        sentiment=sentiment_result["sentiment"],
        sentiment_confidence=sentiment_result["confidence"],
        probabilities=Probabilities(**sentiment_result["probabilities"]),
        latency_ms=sentiment_result["latency_ms"],
    )


# ── Benchmark ─────────────────────────────────────────────────────────────────

@app.get("/inference/benchmark", response_model=BenchmarkResult)
def benchmark():
    """
    Warm up the model and time several batches of synthetic finance texts.
    Reports throughput (articles/sec) and latency percentiles.
    """
    if not is_loaded():
        raise HTTPException(status_code=503, detail="Model not loaded yet")

    stats = run_benchmark(warmup=2, timed=5)
    return BenchmarkResult(**stats)
