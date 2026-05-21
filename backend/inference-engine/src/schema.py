from pydantic import BaseModel, Field
from typing import Literal, Optional

ContentType = Literal["news", "sec_filing", "reddit", "macro"]


class SentimentRequest(BaseModel):
    id: str
    ticker: str
    content_type: ContentType = "news"
    text: str = Field(..., description="Cleaned article text (from preprocessing service)")
    title: Optional[str] = None


class Probabilities(BaseModel):
    positive: float
    negative: float
    neutral: float


class SentimentResult(BaseModel):
    id: str
    ticker: str
    content_type: ContentType = "news"
    sentiment: str  # positive | negative | neutral
    confidence: float
    probabilities: Probabilities
    latency_ms: float


class BatchSentimentRequest(BaseModel):
    articles: list[SentimentRequest]


class BatchSentimentResponse(BaseModel):
    results: list[SentimentResult]
    total_articles: int
    total_latency_ms: float
    throughput_articles_per_sec: float
    device: str


class ClassifyRequest(BaseModel):
    id: str
    ticker: str
    content_type: ContentType = "news"
    text: str
    title: Optional[str] = None


class ClassifyResult(BaseModel):
    id: str
    ticker: str
    content_type: ContentType = "news"
    event_type: str  # earnings | fda | merger | analyst | macro | filing | other
    event_confidence: float
    sentiment: str
    sentiment_confidence: float
    probabilities: Probabilities
    latency_ms: float


class BenchmarkResult(BaseModel):
    device: str
    model: str
    batch_size: int
    warmup_runs: int
    timed_runs: int
    avg_latency_ms: float
    p50_latency_ms: float
    p99_latency_ms: float
    throughput_articles_per_sec: float
    total_articles_processed: int
