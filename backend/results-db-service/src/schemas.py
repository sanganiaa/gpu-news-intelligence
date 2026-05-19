from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


# ── Signal ────────────────────────────────────────────────────────────────────

class SignalCreate(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    id: str
    ticker: str
    signal: str                        # BUY | HOLD | SELL
    confidence: float
    sentiment_score: Optional[float] = None
    reasoning: Optional[str] = None
    article_ids: Optional[list[str]] = None
    model_name: Optional[str] = None
    created_at: Optional[datetime] = None


class OutcomeUpdate(BaseModel):
    outcome: str                       # UP | DOWN | FLAT
    outcome_pct: Optional[float] = None


class SignalOut(BaseModel):
    model_config = ConfigDict(from_attributes=True, protected_namespaces=())

    id: str
    ticker: str
    signal: str
    confidence: float
    sentiment_score: Optional[float]
    reasoning: Optional[str]
    article_ids: Optional[list[str]]
    model_name: Optional[str]
    created_at: datetime
    outcome: Optional[str]
    outcome_pct: Optional[float]
    outcome_recorded_at: Optional[datetime]


# ── Article ───────────────────────────────────────────────────────────────────

class ArticleCreate(BaseModel):
    id: str
    ticker: str
    source: str
    title: str
    summary: Optional[str] = None
    url: str
    published_at: datetime
    ingested_at: datetime
    raw_text: Optional[str] = None
    is_filing: bool = False
    filing_type: Optional[str] = None


class ArticleOut(BaseModel):
    id: str
    ticker: str
    source: str
    title: str
    summary: Optional[str]
    url: str
    published_at: datetime
    ingested_at: datetime
    is_filing: bool
    filing_type: Optional[str]

    model_config = {"from_attributes": True}


# ── ModelMetric ───────────────────────────────────────────────────────────────

class MetricCreate(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    metric_name: str
    value: float
    model_name: Optional[str] = None
    ticker: Optional[str] = None
    extra: Optional[dict] = None


class MetricOut(BaseModel):
    model_config = ConfigDict(from_attributes=True, protected_namespaces=())

    id: int
    metric_name: str
    value: float
    model_name: Optional[str]
    ticker: Optional[str]
    recorded_at: datetime
    extra: Optional[str]


# ── Accuracy summary ─────────────────────────────────────────────────────────

class AccuracySummary(BaseModel):
    ticker: Optional[str]
    total_signals: int
    signals_with_outcome: int
    correct: int
    accuracy: float
    by_signal: dict[str, dict]
