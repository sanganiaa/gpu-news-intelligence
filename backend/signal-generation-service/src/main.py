import asyncio
import logging
import math
import os
import uuid
from datetime import datetime, timezone
from typing import Literal, Optional

import httpx
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

INFERENCE_URL = os.getenv("INFERENCE_URL", "http://localhost:5003")
PREPROCESSING_URL = os.getenv("PREPROCESSING_URL", "http://localhost:5002")
NEWS_URL = os.getenv("NEWS_URL", "http://localhost:5001")
RESULTS_DB_URL = os.getenv("RESULTS_DB_URL", "http://localhost:5005")
CONFIDENCE_THRESHOLD = float(os.getenv("CONFIDENCE_THRESHOLD", "0.65"))
# Exponential decay rate per hour — half-life ≈ 7h at 0.1
DECAY_RATE = float(os.getenv("DECAY_RATE", "0.1"))
SIGNAL_TTL_SECONDS = int(os.getenv("SIGNAL_TTL_SECONDS", "300"))
SIGNAL_INGEST_INTERVAL_SECONDS = int(os.getenv("SIGNAL_INGEST_INTERVAL_SECONDS", "120"))

DEFAULT_TICKERS = [
    "NVDA", "AAPL", "MSFT", "META", "TSLA",
    "AMZN", "AMD", "GOOGL", "NFLX", "PLTR",
]

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("signal-generation-service")

# ── Optional Redis client for last_fetched_at tracking ────────────────────────

_REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
_redis_client = None


def _init_redis() -> None:
    global _redis_client
    try:
        import redis as _redis_lib
        r = _redis_lib.from_url(_REDIS_URL, socket_connect_timeout=2, decode_responses=True)
        r.ping()
        _redis_client = r
        logger.info("[Redis] Connected at %s", _REDIS_URL)
    except Exception as exc:
        logger.warning("[Redis] Unavailable (%s) — last_fetched tracking disabled", exc)


def _set_last_fetched(ticker: str) -> None:
    if _redis_client:
        try:
            _redis_client.set(f"last_fetched:{ticker}", datetime.now(timezone.utc).isoformat())
        except Exception:
            pass

app = FastAPI(title="Signal Generation Service")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Schemas ────────────────────────────────────────────────────────────────────

ContentType = Literal["news", "sec_filing", "reddit", "macro"]

class ArticleSentiment(BaseModel):
    article_id: str
    ticker: str
    content_type: ContentType = "news"
    title: str
    published_at: datetime
    positive: float
    negative: float
    neutral: float
    net_sentiment: float  # positive - negative, range [-1, 1]
    weight: float         # time-decay weight applied during aggregation


class Signal(BaseModel):
    ticker: str
    verdict: str          # "BUY" | "HOLD" | "SELL"
    confidence: float     # 0.0 – 1.0
    net_sentiment: float  # weighted average net sentiment
    article_count: int
    generated_at: datetime
    supporting_articles: list[ArticleSentiment]


class GenerateRequest(BaseModel):
    ticker: str
    content_type: ContentType = "news"
    title: str
    text: str
    published_at: Optional[datetime] = None
    article_id: Optional[str] = None


class IngestTickerResult(BaseModel):
    ticker: str
    status: str
    signal: Optional[Signal] = None
    error: Optional[str] = None


class IngestAllResult(BaseModel):
    started_at: datetime
    completed_at: datetime
    source: str
    tickers: list[str]
    results: list[IngestTickerResult]


# ── In-memory signal cache ─────────────────────────────────────────────────────

# { "NVDA": {"signal": Signal, "expires_at": float} }
_cache: dict[str, dict] = {}
_scheduler: Optional[AsyncIOScheduler] = None


def _get_cached(ticker: str) -> Optional[Signal]:
    entry = _cache.get(ticker)
    if not entry:
        return None
    if datetime.now(timezone.utc).timestamp() > entry["expires_at"]:
        del _cache[ticker]
        return None
    return entry["signal"]


def _set_cached(ticker: str, signal: Signal) -> None:
    _cache[ticker] = {
        "signal": signal,
        "expires_at": datetime.now(timezone.utc).timestamp() + SIGNAL_TTL_SECONDS,
    }


# ── Helpers ────────────────────────────────────────────────────────────────────

def _time_weight(published_at: datetime, now: datetime) -> float:
    """Exponential decay so recent articles outweigh old ones."""
    pub = published_at if published_at.tzinfo else published_at.replace(tzinfo=timezone.utc)
    age_hours = max(0.0, (now - pub).total_seconds() / 3600)
    return math.exp(-DECAY_RATE * age_hours)


def _verdict(net_sentiment: float, article_count: int) -> tuple[str, float]:
    """Map weighted net sentiment to verdict + confidence score."""
    # Coverage factor boosts confidence when we have more corroborating articles
    coverage = min(article_count / 10.0, 1.0)
    raw = abs(net_sentiment)
    confidence = raw * (0.6 + 0.4 * coverage)

    if net_sentiment > 0.1:
        return "BUY", confidence
    if net_sentiment < -0.1:
        return "SELL", confidence
    # Neutral — high confidence when sentiment is truly flat
    return "HOLD", 1.0 - raw


def _parse_sentiment(payload: dict) -> tuple[float, float, float]:
    """
    Normalise inference engine response to (positive, negative, neutral).
    Handles:
      {"probabilities": {"positive": 0.8, "negative": 0.1, "neutral": 0.1}, ...}  ← actual engine format
      {"positive": 0.8, "negative": 0.1, "neutral": 0.1}
      {"sentiment": "positive", "confidence": 0.8}
    """
    # Actual inference engine format: SentimentResult with nested probabilities
    probs = payload.get("probabilities")
    if isinstance(probs, dict):
        return float(probs.get("positive", 0.0)), float(probs.get("negative", 0.0)), float(probs.get("neutral", 0.0))

    # Flat format
    if "positive" in payload:
        return float(payload["positive"]), float(payload["negative"]), float(payload["neutral"])

    # Fallback: derive from sentiment label + confidence
    label = payload.get("sentiment", payload.get("label", "neutral"))
    score = float(payload.get("confidence", payload.get("score", 0.0)))
    remainder = (1.0 - score) / 2
    if label == "positive":
        return score, remainder, remainder
    if label == "negative":
        return remainder, score, remainder
    return remainder, remainder, score


async def _infer_single(
    article_id: str,
    ticker: str,
    title: str,
    text: str,
    client: httpx.AsyncClient,
    content_type: ContentType = "news",
) -> Optional[dict]:
    try:
        resp = await client.post(
            f"{INFERENCE_URL}/inference/sentiment",
            json={
                "id": article_id,
                "ticker": ticker,
                "content_type": content_type,
                "title": title,
                "text": text,
            },
            timeout=10.0,
        )
        resp.raise_for_status()
        return resp.json()
    except Exception as exc:
        print(f"[Inference] single call failed: {exc}")
        return None


async def _infer_batch(
    infer_articles: list[dict], client: httpx.AsyncClient
) -> Optional[list[dict]]:
    try:
        resp = await client.post(
            f"{INFERENCE_URL}/inference/batch",
            json={"articles": infer_articles},
            timeout=30.0,
        )
        resp.raise_for_status()
        data = resp.json()
        results = data.get("results") if isinstance(data, dict) else None
        if isinstance(results, list) and len(results) == len(infer_articles):
            return results
        return None
    except Exception as exc:
        print(f"[Inference] batch call failed: {exc}")
        return None


async def _fetch_articles(ticker: str, client: httpx.AsyncClient) -> list[dict]:
    try:
        resp = await client.get(
            f"{NEWS_URL}/news/{ticker}",
            params={"limit": 20},
            timeout=5.0,
        )
        resp.raise_for_status()
        return resp.json()
    except Exception as exc:
        print(f"[News] fetch failed for {ticker}: {exc}")
        return []


async def _preprocess_articles(articles: list[dict], client: httpx.AsyncClient) -> list[dict]:
    if not articles:
        return []
    try:
        resp = await client.post(
            f"{PREPROCESSING_URL}/preprocess/batch",
            json=articles,
            timeout=30.0,
        )
        resp.raise_for_status()
        data = resp.json()
        return data if isinstance(data, list) else []
    except Exception as exc:
        print(f"[Preprocessing] batch call failed: {exc}")
        return []


# ── Results DB persistence ─────────────────────────────────────────────────────

async def _store_signal(signal: Signal, client: httpx.AsyncClient) -> None:
    payload = {
        "id": str(uuid.uuid4()),
        "ticker": signal.ticker,
        "signal": signal.verdict,
        "confidence": signal.confidence,
        "sentiment_score": signal.net_sentiment,
        "reasoning": (
            f"{signal.article_count} article(s) analyzed; "
            f"weighted net sentiment {signal.net_sentiment:+.4f}"
        ),
        "article_ids": [
            a.article_id for a in signal.supporting_articles if a.article_id
        ],
        "model_name": "finbert",
        "created_at": signal.generated_at.isoformat(),
    }
    try:
        resp = await client.post(
            f"{RESULTS_DB_URL}/results/signal",
            json=payload,
            timeout=5.0,
        )
        resp.raise_for_status()
    except Exception as exc:
        print(f"[ResultsDB] store failed: {exc}")


async def _store_article(article: dict, client: httpx.AsyncClient) -> None:
    payload = {
        "id": article.get("id"),
        "ticker": article.get("ticker", "").upper(),
        "source": article.get("source", ""),
        "content_type": article.get("content_type", "news"),
        "title": article.get("title", ""),
        "summary": article.get("summary"),
        "url": article.get("url", ""),
        "published_at": article.get("published_at"),
        "ingested_at": article.get("ingested_at"),
        "raw_text": article.get("raw_text"),
        "is_filing": bool(article.get("is_filing", False)),
        "filing_type": article.get("filing_type"),
    }
    if not payload["id"] or not payload["ticker"] or not payload["url"]:
        return
    try:
        resp = await client.post(
            f"{RESULTS_DB_URL}/results/article",
            json=payload,
            timeout=5.0,
        )
        resp.raise_for_status()
    except Exception as exc:
        print(f"[ResultsDB] article store failed: {exc}")


# ── Ingestion orchestration ────────────────────────────────────────────────────

async def _ingest_ticker_signal(ticker: str, client: httpx.AsyncClient) -> Signal:
    ticker = ticker.upper()
    signal = await _compute_signal(ticker, persist_articles=True, results_client=client)
    _set_cached(ticker, signal)
    await _store_signal(signal, client)
    _set_last_fetched(ticker)
    return signal


async def _ingest_all_signals(source: str) -> IngestAllResult:
    started_at = datetime.now(timezone.utc)
    tickers = [ticker.upper() for ticker in DEFAULT_TICKERS]
    logger.info(
        "[SignalsIngest] %s run started at %s for tickers=%s",
        source,
        started_at.isoformat(),
        ",".join(tickers),
    )

    results: list[IngestTickerResult] = []
    total = len(tickers)
    async with httpx.AsyncClient() as client:
        for i, ticker in enumerate(tickers, 1):
            logger.info("[Scheduler] Ingesting %s (%d/%d)...", ticker, i, total)
            try:
                signal = await _ingest_ticker_signal(ticker, client)
                results.append(IngestTickerResult(
                    ticker=ticker,
                    status="ok",
                    signal=signal,
                ))
            except Exception as exc:
                logger.exception("[SignalsIngest] %s failed for %s", source, ticker)
                results.append(IngestTickerResult(
                    ticker=ticker,
                    status="error",
                    error=str(exc),
                ))

    completed_at = datetime.now(timezone.utc)
    summary = [
        {
            "ticker": result.ticker,
            "status": result.status,
            "verdict": result.signal.verdict if result.signal else None,
            "confidence": result.signal.confidence if result.signal else None,
            "article_count": result.signal.article_count if result.signal else None,
            "error": result.error,
        }
        for result in results
    ]
    logger.info(
        "[SignalsIngest] %s run completed at %s results=%s",
        source,
        completed_at.isoformat(),
        summary,
    )

    return IngestAllResult(
        started_at=started_at,
        completed_at=completed_at,
        source=source,
        tickers=tickers,
        results=results,
    )


# ── Core aggregation ───────────────────────────────────────────────────────────

async def _compute_signal(
    ticker: str,
    persist_articles: bool = False,
    results_client: Optional[httpx.AsyncClient] = None,
) -> Signal:
    now = datetime.now(timezone.utc)

    async with httpx.AsyncClient() as client:
        articles = await _fetch_articles(ticker, client)
        if persist_articles and results_client:
            await asyncio.gather(*[_store_article(article, results_client) for article in articles])

        if not articles:
            return Signal(
                ticker=ticker,
                verdict="HOLD",
                confidence=0.0,
                net_sentiment=0.0,
                article_count=0,
                generated_at=now,
                supporting_articles=[],
            )

        processed_articles = await _preprocess_articles(articles, client)
        article_by_id = {article.get("id"): article for article in articles}

        # Build per-document inference payloads from preprocessed text. If the
        # preprocessing service is unavailable, preserve signal continuity with
        # the raw summary fallback used by earlier versions.
        infer_articles = [
            {
                "id": a.get("id") or str(uuid.uuid4()),
                "ticker": a.get("ticker", ticker),
                "content_type": a.get("content_type", "news"),
                "title": a.get("title", ""),
                "text": (a.get("clean_text") or "")[:512].strip(),
            }
            for a in processed_articles
            if (a.get("clean_text") or "").strip()
        ] or [
            {
                "id": a.get("id") or str(uuid.uuid4()),
                "ticker": ticker,
                "content_type": a.get("content_type", "news"),
                "title": a.get("title", ""),
                "text": (a.get("summary") or "")[:512].strip(),
            }
            for a in articles
        ]

        # Prefer batch; fall back to individual calls for the 5 newest articles
        sentiments = await _infer_batch(infer_articles, client)
        if sentiments is None:
            sentiments = []
            for art in infer_articles[:5]:
                result = await _infer_single(
                    art["id"],
                    art["ticker"],
                    art["title"],
                    art["text"],
                    client,
                    art.get("content_type", "news"),
                )
                sentiments.append(result)
            # Pad with None for articles we skipped
            sentiments += [None] * (len(infer_articles) - len(sentiments))

        # Weighted aggregation
        weighted_sum = 0.0
        weight_total = 0.0
        article_sentiments: list[ArticleSentiment] = []

        for infer_article, sentiment in zip(infer_articles, sentiments):
            if not sentiment:
                continue

            article = article_by_id.get(infer_article.get("id"), infer_article)

            pub_str = article.get("published_at")
            try:
                pub_dt = datetime.fromisoformat(pub_str.replace("Z", "+00:00")) if pub_str else now
            except Exception:
                pub_dt = now

            pos, neg, neu = _parse_sentiment(sentiment)
            net = pos - neg
            w = _time_weight(pub_dt, now)

            weighted_sum += w * net
            weight_total += w

            article_sentiments.append(ArticleSentiment(
                article_id=article.get("id", ""),
                ticker=ticker,
                content_type=article.get("content_type", "news"),
                title=article.get("title", ""),
                published_at=pub_dt,
                positive=round(pos, 4),
                negative=round(neg, 4),
                neutral=round(neu, 4),
                net_sentiment=round(net, 4),
                weight=round(w, 4),
            ))

        final_net = (weighted_sum / weight_total) if weight_total > 0 else 0.0
        verdict, confidence = _verdict(final_net, len(article_sentiments))

        # Sort by weight descending for the supporting_articles preview
        article_sentiments.sort(key=lambda a: a.weight, reverse=True)

        return Signal(
            ticker=ticker,
            verdict=verdict,
            confidence=round(confidence, 4),
            net_sentiment=round(final_net, 4),
            article_count=len(article_sentiments),
            generated_at=now,
            supporting_articles=article_sentiments[:5],
        )


# ── Scheduler ──────────────────────────────────────────────────────────────────

@app.on_event("startup")
async def startup():
    """Start the periodic all-ticker signal ingestion scheduler."""
    global _scheduler
    _init_redis()
    _scheduler = AsyncIOScheduler(timezone=timezone.utc)
    _scheduler.add_job(
        _ingest_all_signals,
        "interval",
        seconds=SIGNAL_INGEST_INTERVAL_SECONDS,
        args=["scheduler"],
        id="signals_ingest_all",
        coalesce=True,
        max_instances=1,
    )
    _scheduler.start()
    logger.info(
        "[SignalsIngest] Scheduled all-ticker ingestion every %ss",
        SIGNAL_INGEST_INTERVAL_SECONDS,
    )
    # Fire one cycle immediately so signals are ready without waiting 60 min.
    # create_task() returns instantly — startup is not blocked.
    asyncio.create_task(_ingest_all_signals("startup"))
    logger.info("[SignalsIngest] Initial ingestion cycle started in background")


@app.on_event("shutdown")
async def shutdown():
    """Stop the scheduler cleanly when the service exits."""
    if _scheduler:
        _scheduler.shutdown(wait=False)


# ── Routes ─────────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "signal-generation-service",
        "cached_tickers": list(_cache.keys()),
        "inference_url": INFERENCE_URL,
        "news_url": NEWS_URL,
        "signal_ingest_interval_seconds": SIGNAL_INGEST_INTERVAL_SECONDS,
    }


# Literal-path routes must be declared before /signals/{ticker} to avoid
# path parameter capture.

@app.get("/signals/all")
def get_all_signals() -> dict:
    """Return cached signals for all default tickers in a single response.

    Only tickers that already have a cached (non-expired) signal are included.
    Frontend can call this once on mount to populate all 10 panels instantly.
    """
    result = {}
    for ticker in DEFAULT_TICKERS:
        signal = _get_cached(ticker)
        if signal is not None:
            result[ticker] = signal.model_dump()
    return result


@app.get("/signals/top-picks", response_model=list[Signal])
async def top_picks(limit: int = Query(5, le=20)):
    """Compute signals for all default tickers and return the top BUY signals."""
    signals = await asyncio.gather(*[_compute_signal(t) for t in DEFAULT_TICKERS])

    for signal in signals:
        _set_cached(signal.ticker, signal)

    buy_signals = [s for s in signals if s.verdict == "BUY"]
    buy_signals.sort(key=lambda s: s.confidence, reverse=True)
    return buy_signals[:limit]


@app.post("/signals/ingest/all", response_model=IngestAllResult)
async def ingest_all_signals():
    """Fetch articles, run inference, and persist signals for all tracked tickers."""
    return await _ingest_all_signals("manual")


@app.post("/signals/ingest/{ticker}", response_model=Signal)
async def ingest_and_signal(ticker: str):
    """Fetch articles from news service, run inference, persist to results DB, return signal."""
    ticker = ticker.upper()
    started_at = datetime.now(timezone.utc)

    async with httpx.AsyncClient() as client:
        signal = await _ingest_ticker_signal(ticker, client)

    logger.info(
        "[SignalsIngest] manual run at %s result=%s",
        started_at.isoformat(),
        {
            "ticker": signal.ticker,
            "verdict": signal.verdict,
            "confidence": signal.confidence,
            "article_count": signal.article_count,
        },
    )
    return signal


@app.get("/signals/{ticker}", response_model=Signal)
async def get_signal(ticker: str, refresh: bool = Query(False)):
    """Return the current BUY/HOLD/SELL signal for a ticker."""
    ticker = ticker.upper()

    if not refresh:
        cached = _get_cached(ticker)
        if cached:
            return cached

    signal = await _compute_signal(ticker)
    _set_cached(ticker, signal)
    return signal


@app.post("/signals/generate", response_model=Signal)
async def generate_signal(req: GenerateRequest):
    """Generate a signal directly from a provided article without fetching from the news service."""
    now = datetime.now(timezone.utc)
    pub_dt = req.published_at or now
    ticker = req.ticker.upper()

    async with httpx.AsyncClient() as client:
        sentiment = await _infer_single(
            req.article_id or str(uuid.uuid4()),
            ticker,
            req.title,
            req.text[:512].strip(),
            client,
            req.content_type,
        )

    if not sentiment:
        raise HTTPException(status_code=503, detail="Inference engine unavailable")

    pos, neg, neu = _parse_sentiment(sentiment)
    net = pos - neg
    verdict, confidence = _verdict(net, 1)
    w = _time_weight(pub_dt, now)

    return Signal(
        ticker=ticker,
        verdict=verdict,
        confidence=round(confidence, 4),
        net_sentiment=round(net, 4),
        article_count=1,
        generated_at=now,
        supporting_articles=[
            ArticleSentiment(
                article_id=req.article_id or "",
                ticker=ticker,
                content_type=req.content_type,
                title=req.title,
                published_at=pub_dt,
                positive=round(pos, 4),
                negative=round(neg, 4),
                neutral=round(neu, 4),
                net_sentiment=round(net, 4),
                weight=round(w, 4),
            )
        ],
    )
