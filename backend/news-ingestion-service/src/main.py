import os
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from datetime import datetime, timezone
from typing import Literal

from .sources.yahoo import fetch_yahoo_rss
from .sources.newsapi import fetch_newsapi
from .sources.edgar import fetch_edgar_8k
from .sources.fred import fetch_fred_indicators
from .sources.reddit import fetch_reddit_top_posts
from .dedup import seen_count, clear
from .schema import Article

ContentType = Literal["news", "sec_filing", "reddit", "macro"]

app = FastAPI(title="News Ingestion Service")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
# Default watchlist — polled automatically on the scheduler
# Any ticker outside this list can still be fetched on-demand via GET /news/{ticker}
DEFAULT_TICKERS = [
    "NVDA", "AAPL", "MSFT", "META", "TSLA",
    "AMZN", "AMD", "SNOW", "PLTR", "SMCI",
    "INTC", "QCOM", "ARM", "AVGO", "TSM",
    "ASML", "ORCL", "CRM", "ADBE", "NOW",
]

POLL_INTERVAL = int(os.getenv("POLL_INTERVAL_SECONDS", 60))

# In-memory article store — keyed by ticker for fast lookup
# Structure: { "NVDA": [Article, ...], "AAPL": [...], ... }
_store: dict[str, list[Article]] = {}


def _all_articles() -> list[Article]:
    return [a for articles in _store.values() for a in articles]


def _filter_articles(
    articles: list[Article],
    content_type: ContentType | None = None,
) -> list[Article]:
    if not content_type:
        return articles
    return [a for a in articles if a.content_type == content_type]


def store_articles(articles: list[Article]):
    """Add new articles to the in-memory store, grouped by ticker."""
    for article in articles:
        ticker = article.ticker
        if ticker not in _store:
            _store[ticker] = []
        _store[ticker].append(article)


async def ingest_ticker(ticker: str) -> list[Article]:
    """
    Fetch from all 3 sources for a single ticker.
    Returns only newly ingested articles (dedup already applied inside each source).
    """
    ticker = ticker.upper()
    new_articles = []

    yahoo   = await fetch_yahoo_rss(ticker)
    newsapi = await fetch_newsapi(ticker)
    edgar   = await fetch_edgar_8k(ticker)

    new_articles.extend(yahoo)
    new_articles.extend(newsapi)
    new_articles.extend(edgar)

    store_articles(new_articles)

    print(
        f"[{ticker}] Ingested {len(new_articles)} new articles "
        f"(Yahoo: {len(yahoo)}, NewsAPI: {len(newsapi)}, EDGAR: {len(edgar)})"
    )
    return new_articles


async def ingest_watchlist():
    """Poll all default tickers — runs on scheduler."""
    print(f"\n[Scheduler] Starting watchlist cycle at {datetime.now(timezone.utc).isoformat()}")
    total = 0
    for ticker in DEFAULT_TICKERS:
        articles = await ingest_ticker(ticker)
        total += len(articles)

    macro_articles = await fetch_fred_indicators()
    reddit_articles = await fetch_reddit_top_posts()
    store_articles(macro_articles + reddit_articles)
    total += len(macro_articles) + len(reddit_articles)

    print(
        f"[Scheduler] Non-ticker sources "
        f"(FRED: {len(macro_articles)}, Reddit: {len(reddit_articles)})"
    )
    print(f"[Scheduler] Cycle complete — {total} new articles, {seen_count()} total deduped\n")


@app.on_event("startup")
async def startup():
    """Run one ingestion cycle immediately, then start the scheduler."""
    await ingest_watchlist()
    scheduler = AsyncIOScheduler()
    scheduler.add_job(ingest_watchlist, "interval", seconds=POLL_INTERVAL)
    scheduler.start()
    print(f"[Scheduler] Polling watchlist every {POLL_INTERVAL}s")


# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "news-ingestion-service",
        "tickers_tracked": list(_store.keys()),
        "total_articles": sum(len(v) for v in _store.values()),
        "dedup_seen": seen_count(),
        "poll_interval_seconds": POLL_INTERVAL,
    }


@app.get("/news/latest")
def get_latest(
    limit: int = Query(50, le=200),
    content_type: ContentType | None = Query(None),
):
    """Return most recently ingested articles across all tickers."""
    all_articles = _filter_articles(_all_articles(), content_type)
    sorted_articles = sorted(all_articles, key=lambda a: a.ingested_at, reverse=True)
    return [a.model_dump() for a in sorted_articles[:limit]]


# Specific literal routes must be declared before /news/{ticker} so FastAPI
# doesn't swallow them as ticker path parameters.
@app.get("/articles")
def get_articles(
    limit: int = Query(50, le=500),
    ticker: str | None = Query(None),
    content_type: ContentType | None = Query(None),
):
    """Return ingested items, optionally filtered by ticker and content type."""
    articles = _all_articles()
    if ticker:
        articles = [a for a in articles if a.ticker == ticker.upper()]
    articles = _filter_articles(articles, content_type)
    sorted_articles = sorted(articles, key=lambda a: a.ingested_at, reverse=True)
    return [a.model_dump() for a in sorted_articles[:limit]]


@app.get("/news/tickers")
def list_tickers():
    """List all tickers currently in the store with their article counts."""
    return {ticker: len(articles) for ticker, articles in _store.items()}


@app.get("/news/sources/status")
def source_status():
    """Article count broken down by source across all tickers."""
    counts: dict[str, int] = {
        "yahoo_rss": 0,
        "newsapi": 0,
        "sec_edgar": 0,
        "fred": 0,
        "reddit": 0,
    }
    for articles in _store.values():
        for a in articles:
            if a.source in counts:
                counts[a.source] += 1
    return counts


@app.get("/news/{ticker}")
async def get_by_ticker(
    ticker: str,
    limit: int = Query(20, le=100),
    refresh: bool = Query(False),
    content_type: ContentType | None = Query(None),
):
    """
    Return articles for a specific ticker.
    Works for ANY ticker — not just the default watchlist.
    If refresh=true or ticker not in store, triggers a live fetch first.
    """
    ticker = ticker.upper()

    if refresh or ticker not in _store:
        print(f"[On-demand] Fetching {ticker}...")
        await ingest_ticker(ticker)

    articles = _filter_articles(_store.get(ticker, []), content_type)
    if not articles:
        return []

    sorted_articles = sorted(articles, key=lambda a: a.published_at, reverse=True)
    return [a.model_dump() for a in sorted_articles[:limit]]


@app.post("/news/ingest")
async def trigger_ingest(ticker: str | None = None):
    """
    Manually trigger an ingestion cycle.
    Pass ?ticker=NVDA to ingest a single ticker, or omit to run the full watchlist.
    """
    if ticker:
        articles = await ingest_ticker(ticker.upper())
        return {
            "status": "ok",
            "ticker": ticker.upper(),
            "new_articles": len(articles),
        }
    else:
        await ingest_watchlist()
        return {
            "status": "ok",
            "total_articles": sum(len(v) for v in _store.values()),
        }


@app.delete("/news/reset")
def reset_store():
    """Clear the in-memory store and dedup cache — useful for testing."""
    _store.clear()
    clear()
    return {"status": "ok", "message": "Store and dedup cache cleared"}
