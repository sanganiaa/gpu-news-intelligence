from datetime import datetime, timezone
from sqlalchemy import Boolean, Column, DateTime, Float, Integer, String, Text

from .database import Base


def _utcnow():
    return datetime.now(timezone.utc)


class Signal(Base):
    __tablename__ = "signals"

    id = Column(String, primary_key=True)          # caller-supplied UUID
    ticker = Column(String, nullable=False, index=True)
    signal = Column(String, nullable=False)         # BUY | HOLD | SELL
    confidence = Column(Float, nullable=False)      # 0.0–1.0
    sentiment_score = Column(Float, nullable=True)  # -1.0–1.0
    reasoning = Column(Text, nullable=True)
    article_ids = Column(Text, nullable=True)       # JSON-encoded list of article IDs
    model_name = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)

    # Filled in later via PATCH /results/signal/{id}/outcome
    outcome = Column(String, nullable=True)         # UP | DOWN | FLAT
    outcome_pct = Column(Float, nullable=True)      # % price change
    outcome_recorded_at = Column(DateTime(timezone=True), nullable=True)


class Article(Base):
    __tablename__ = "articles"

    id = Column(String, primary_key=True)           # SHA256 of URL (mirrors ingestion service)
    ticker = Column(String, nullable=False, index=True)
    source = Column(String, nullable=False)         # yahoo_rss | newsapi | sec_edgar
    title = Column(String, nullable=False)
    summary = Column(Text, nullable=True)
    url = Column(String, nullable=False)
    published_at = Column(DateTime(timezone=True), nullable=False)
    ingested_at = Column(DateTime(timezone=True), nullable=False)
    raw_text = Column(Text, nullable=True)
    is_filing = Column(Boolean, default=False, nullable=False)
    filing_type = Column(String, nullable=True)


class ModelMetric(Base):
    __tablename__ = "model_metrics"

    id = Column(Integer, primary_key=True, autoincrement=True)
    metric_name = Column(String, nullable=False, index=True)  # accuracy | precision | recall | f1 | latency_ms
    value = Column(Float, nullable=False)
    model_name = Column(String, nullable=True)
    ticker = Column(String, nullable=True)          # None means global / cross-ticker
    recorded_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)
    extra = Column(Text, nullable=True)             # JSON blob for arbitrary context
