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
from .dedup import seen_count
from .schema import Article
from .cache import cache

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


def _all_articles() -> list[Article]:
    return cache.get_all_articles()


def _article_identity(article: Article) -> str:
    return article.id or article.url


def _unique_articles(articles: list[Article]) -> list[Article]:
    by_identity: dict[str, Article] = {}
    for article in articles:
        identity = _article_identity(article)
        if identity and identity not in by_identity:
            by_identity[identity] = article
    return list(by_identity.values())


def _infer_content_type(article: Article) -> ContentType:
    source = (article.source or "").lower()
    title = (article.title or "").lower()
    if (
        article.content_type == "sec_filing"
        or article.is_filing
        or article.filing_type
        or "edgar" in source
        or source == "sec"
        or "sec filing" in title
        or "form 8-k" in title
        or "form 10-k" in title
        or "form 10-q" in title
        or "8-k" in title
        or "10-k" in title
        or "10-q" in title
    ):
        return "sec_filing"
    if article.content_type in {"news", "reddit", "macro"}:
        return article.content_type
    if source == "reddit":
        return "reddit"
    if source == "fred" or article.ticker.upper() == "MACRO":
        return "macro"
    return "news"


def _source_bucket(article: Article) -> str:
    source = (article.source or "").lower()
    if "yahoo" in source:
        return "yahoo_rss"
    if "newsapi" in source or "news api" in source:
        return "newsapi"
    if "edgar" in source or source == "sec" or _infer_content_type(article) == "sec_filing":
        return "sec_edgar"
    if source == "fred":
        return "fred"
    if source == "reddit":
        return "reddit"
    return "other"


def _article_payload(article: Article) -> dict:
    payload = article.model_dump()
    content_type = _infer_content_type(article)
    payload["content_type"] = content_type
    payload["is_filing"] = bool(
        article.is_filing
        or article.filing_type
        or content_type == "sec_filing"
    )
    if payload["is_filing"] and not payload.get("filing_type"):
        payload["filing_type"] = "SEC filing"
    payload["tickers"] = article.tickers or [article.ticker]
    return payload


def _filter_articles(
    articles: list[Article],
    content_type: ContentType | None = None,
) -> list[Article]:
    if not content_type:
        return articles
    return [a for a in articles if _infer_content_type(a) == content_type]


def store_articles(articles: list[Article]):
    """Add new articles to the store, grouped by ticker."""
    by_ticker: dict[str, list[Article]] = {}
    for article in articles:
        by_ticker.setdefault(article.ticker, []).append(article)
    for ticker, ticker_articles in by_ticker.items():
        cache.save_articles(ticker, ticker_articles)


async def ingest_ticker(ticker: str) -> list[Article]:
    """
    Fetch from all 3 sources for a single ticker.
    Returns only newly ingested articles (dedup already applied inside each source).
    """
    ticker = ticker.upper()
    new_articles = []

    before_count = cache.get_article_count(ticker)

    yahoo   = await fetch_yahoo_rss(ticker)
    newsapi = await fetch_newsapi(ticker)
    edgar   = await fetch_edgar_8k(ticker)

    new_articles.extend(yahoo)
    new_articles.extend(newsapi)
    new_articles.extend(edgar)

    store_articles(new_articles)
    after_count = cache.get_article_count(ticker)

    print(
        f"[{ticker}] Ingested {len(new_articles)} new articles "
        f"(Yahoo: {len(yahoo)}, NewsAPI: {len(newsapi)}, EDGAR: {len(edgar)}); "
        f"cached_before={before_count} cached_after={after_count}"
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
    redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
    if cache.connected:
        print(f"[Cache] Redis connected at {redis_url}")
    else:
        print("[Cache] Redis unavailable — using in-memory fallback")
    await ingest_watchlist()
    scheduler = AsyncIOScheduler()
    scheduler.add_job(ingest_watchlist, "interval", seconds=POLL_INTERVAL)
    scheduler.start()
    print(f"[Scheduler] Polling watchlist every {POLL_INTERVAL}s")


# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    all_articles = _all_articles()
    unique_articles = _unique_articles(all_articles)
    return {
        "status": "ok",
        "service": "news-ingestion-service",
        "tickers_tracked": cache.get_all_tickers(),
        "total_articles": len(all_articles),
        "unique_articles": len(unique_articles),
        "duplicate_mappings": len(all_articles) - len(unique_articles),
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
    return [_article_payload(a) for a in sorted_articles[:limit]]


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
        selected = ticker.upper()
        articles = [a for a in articles if a.ticker.upper() == selected]
    articles = _filter_articles(articles, content_type)
    sorted_articles = sorted(articles, key=lambda a: a.ingested_at, reverse=True)
    return [_article_payload(a) for a in sorted_articles[:limit]]


@app.get("/news/tickers")
def list_tickers():
    """List all tickers currently in the store with their article counts."""
    return cache.get_ticker_counts()


@app.get("/news/sources/status")
def source_status():
    """Current in-memory cache count, deduplicated and grouped by source/content type."""
    all_articles = _all_articles()
    unique_articles = _unique_articles(all_articles)

    source_counts: dict[str, int] = {
        "yahoo_rss": 0,
        "newsapi": 0,
        "sec_edgar": 0,
        "fred": 0,
        "reddit": 0,
        "other": 0,
    }
    content_type_counts: dict[str, int] = {
        "news": 0,
        "sec_filing": 0,
        "reddit": 0,
        "macro": 0,
    }

    for article in unique_articles:
        source_counts[_source_bucket(article)] += 1
        content_type = _infer_content_type(article)
        content_type_counts[content_type] = content_type_counts.get(content_type, 0) + 1

    return {
        "total_cached_items": len(all_articles),
        "unique_cached_items": len(unique_articles),
        "duplicate_mappings": len(all_articles) - len(unique_articles),
        "sources": source_counts,
        "content_types": content_type_counts,
    }


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

    if refresh or not cache.has_ticker(ticker):
        print(f"[On-demand] Fetching {ticker}...")
        await ingest_ticker(ticker)

    articles = _filter_articles(cache.get_articles(ticker, limit=0), content_type)
    if not articles:
        return []

    sorted_articles = sorted(articles, key=lambda a: a.published_at, reverse=True)
    return [_article_payload(a) for a in sorted_articles[:limit]]


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
            "total_articles": sum(cache.get_ticker_counts().values()),
        }


@app.delete("/news/reset")
def reset_store():
    """Clear the article store and dedup cache — useful for testing."""
    cache.clear()
    return {"status": "ok", "message": "Store and dedup cache cleared"}
