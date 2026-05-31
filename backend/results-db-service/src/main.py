import json
import time
from datetime import datetime, timezone
from typing import Optional

from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import inspect, text
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import Session

from .database import Base, engine, get_db
from .models import Article, ModelMetric, Signal
from .schemas import (
    AccuracySummary,
    ArticleCreate,
    ArticleOut,
    MetricCreate,
    MetricOut,
    OutcomeUpdate,
    SignalCreate,
    SignalOut,
)

app = FastAPI(title="Results DB Service")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def create_tables():
    for attempt in range(10):
        try:
            Base.metadata.create_all(bind=engine)
            break
        except OperationalError as exc:
            if attempt < 9:
                print(f"[DB] Connection attempt {attempt + 1}/10 failed, retrying in 2s: {exc}")
                time.sleep(2)
            else:
                raise
    inspector = inspect(engine)
    if "articles" in inspector.get_table_names():
        columns = {column["name"] for column in inspector.get_columns("articles")}
        if "content_type" not in columns:
            with engine.begin() as connection:
                connection.execute(text("ALTER TABLE articles ADD COLUMN content_type VARCHAR NOT NULL DEFAULT 'news'"))
        with engine.begin() as connection:
            connection.execute(text("UPDATE articles SET content_type = 'sec_filing' WHERE is_filing = TRUE OR filing_type IS NOT NULL"))


# ── Health ────────────────────────────────────────────────────────────────────

@app.get("/health")
def health(db: Session = Depends(get_db)):
    signal_count = db.query(Signal).count()
    article_count = db.query(Article).count()
    return {
        "status": "ok",
        "service": "results-db-service",
        "signals_stored": signal_count,
        "articles_stored": article_count,
    }


# ── Signals ───────────────────────────────────────────────────────────────────

@app.post("/results/signal", response_model=SignalOut, status_code=201)
def write_signal(body: SignalCreate, db: Session = Depends(get_db)):
    existing = db.get(Signal, body.id)
    if existing:
        raise HTTPException(status_code=409, detail=f"Signal {body.id} already exists")

    row = Signal(
        id=body.id,
        ticker=body.ticker.upper(),
        signal=body.signal.upper(),
        confidence=body.confidence,
        sentiment_score=body.sentiment_score,
        reasoning=body.reasoning,
        article_ids=json.dumps(body.article_ids) if body.article_ids is not None else None,
        model_name=body.model_name,
        created_at=body.created_at or datetime.now(timezone.utc),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return _signal_out(row)


@app.patch("/results/signal/{signal_id}/outcome", response_model=SignalOut)
def record_outcome(signal_id: str, body: OutcomeUpdate, db: Session = Depends(get_db)):
    row = db.get(Signal, signal_id)
    if not row:
        raise HTTPException(status_code=404, detail="Signal not found")

    row.outcome = body.outcome.upper()
    row.outcome_pct = body.outcome_pct
    row.outcome_recorded_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(row)
    return _signal_out(row)


@app.get("/results/signals/accuracy", response_model=AccuracySummary)
def signal_accuracy(
    ticker: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """Compute accuracy of past signals against recorded outcomes."""
    q = db.query(Signal)
    if ticker:
        q = q.filter(Signal.ticker == ticker.upper())

    all_signals = q.all()
    with_outcome = [s for s in all_signals if s.outcome is not None]

    # A signal is "correct" when direction matches outcome
    # BUY → correct if outcome == UP
    # SELL → correct if outcome == DOWN
    # HOLD → correct if outcome == FLAT
    direction_map = {"BUY": "UP", "SELL": "DOWN", "HOLD": "FLAT"}
    correct = sum(
        1 for s in with_outcome if direction_map.get(s.signal) == s.outcome
    )

    by_signal: dict[str, dict] = {}
    for sig_type in ("BUY", "HOLD", "SELL"):
        subset = [s for s in with_outcome if s.signal == sig_type]
        correct_subset = sum(
            1 for s in subset if direction_map.get(s.signal) == s.outcome
        )
        by_signal[sig_type] = {
            "total": len(subset),
            "correct": correct_subset,
            "accuracy": round(correct_subset / len(subset), 4) if subset else 0.0,
        }

    total_with = len(with_outcome)
    return AccuracySummary(
        ticker=ticker.upper() if ticker else None,
        total_signals=len(all_signals),
        signals_with_outcome=total_with,
        correct=correct,
        accuracy=round(correct / total_with, 4) if total_with else 0.0,
        by_signal=by_signal,
    )


# ── Articles ──────────────────────────────────────────────────────────────────

@app.post("/results/article", response_model=ArticleOut, status_code=201)
def write_article(body: ArticleCreate, db: Session = Depends(get_db)):
    existing = db.get(Article, body.id)
    if existing:
        if body.is_filing or body.filing_type or body.content_type == "sec_filing":
            existing.content_type = "sec_filing"
            existing.is_filing = True
            existing.filing_type = existing.filing_type or body.filing_type
            db.commit()
            db.refresh(existing)
        elif not existing.content_type:
            existing.content_type = body.content_type or "news"
            db.commit()
            db.refresh(existing)
        # Idempotent — return the stored record without error
        return existing

    article_data = body.model_dump()
    if body.is_filing or body.filing_type:
        article_data["content_type"] = "sec_filing"
    row = Article(**article_data)
    row.ticker = body.ticker.upper()
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@app.get("/results/articles", response_model=list[ArticleOut])
def get_articles(
    ticker: Optional[str] = Query(None),
    content_type: Optional[str] = Query(None),
    limit: int = Query(100, le=1000),
    db: Session = Depends(get_db),
):
    """Query stored articles, optionally filtered by ticker and content type."""
    q = db.query(Article)
    if ticker:
        q = q.filter(Article.ticker == ticker.upper())
    if content_type:
        q = q.filter(Article.content_type == content_type)

    rows = q.order_by(Article.ingested_at.desc()).limit(limit).all()
    return [ArticleOut.model_validate(r) for r in rows]


# ── Metrics ───────────────────────────────────────────────────────────────────
# NOTE: POST and GET /results/metrics must be declared BEFORE /results/{ticker}
# so FastAPI doesn't route GET /results/metrics to the wildcard handler.

@app.post("/results/metrics", response_model=MetricOut, status_code=201)
def write_metric(body: MetricCreate, db: Session = Depends(get_db)):
    row = ModelMetric(
        metric_name=body.metric_name,
        value=body.value,
        model_name=body.model_name,
        ticker=body.ticker.upper() if body.ticker else None,
        extra=json.dumps(body.extra) if body.extra else None,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@app.get("/results/metrics")
def get_metrics(
    metric_name: Optional[str] = Query(None),
    model_name: Optional[str] = Query(None),
    ticker: Optional[str] = Query(None),
    limit: int = Query(100, le=1000),
    db: Session = Depends(get_db),
):
    """Query stored model performance metrics."""
    q = db.query(ModelMetric)
    if metric_name:
        q = q.filter(ModelMetric.metric_name == metric_name)
    if model_name:
        q = q.filter(ModelMetric.model_name == model_name)
    if ticker:
        q = q.filter(ModelMetric.ticker == ticker.upper())

    rows = q.order_by(ModelMetric.recorded_at.desc()).limit(limit).all()
    return [MetricOut.model_validate(r) for r in rows]


# ── Per-ticker history ─────────────────────────────────────────────────────────
# Wildcard — must be declared last among GET /results/* routes.

@app.get("/results/{ticker}")
def get_ticker_history(
    ticker: str,
    limit: int = Query(50, le=500),
    content_type: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """Return signals and articles stored for a ticker (for backtesting)."""
    ticker = ticker.upper()

    signals = (
        db.query(Signal)
        .filter(Signal.ticker == ticker)
        .order_by(Signal.created_at.desc())
        .limit(limit)
        .all()
    )

    articles_query = (
        db.query(Article)
        .filter(Article.ticker == ticker)
    )
    if content_type:
        articles_query = articles_query.filter(Article.content_type == content_type)

    articles = articles_query.order_by(Article.ingested_at.desc()).limit(limit).all()

    return {
        "ticker": ticker,
        "signals": [_signal_out(s) for s in signals],
        "articles": [ArticleOut.model_validate(a) for a in articles],
    }


# ── Helpers ───────────────────────────────────────────────────────────────────

def _signal_out(row: Signal) -> SignalOut:
    article_ids = json.loads(row.article_ids) if row.article_ids else None
    return SignalOut(
        id=row.id,
        ticker=row.ticker,
        signal=row.signal,
        confidence=row.confidence,
        sentiment_score=row.sentiment_score,
        reasoning=row.reasoning,
        article_ids=article_ids,
        model_name=row.model_name,
        created_at=row.created_at,
        outcome=row.outcome,
        outcome_pct=row.outcome_pct,
        outcome_recorded_at=row.outcome_recorded_at,
    )
