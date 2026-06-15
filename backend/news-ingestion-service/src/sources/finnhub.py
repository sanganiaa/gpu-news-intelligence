import os
import httpx
from datetime import datetime, timezone, timedelta
from ..schema import Article
from ..dedup import make_id, is_duplicate, mark_seen

FINNHUB_URL = "https://finnhub.io/api/v1/company-news"
MAX_ARTICLES = 5


async def fetch_finnhub(ticker: str) -> list[Article]:
    """Fetch company news from Finnhub. Silently skips if FINNHUB_API_KEY is not set."""
    api_key = os.getenv("FINNHUB_API_KEY", "")
    if not api_key:
        return []

    ticker = ticker.upper()
    now = datetime.now(timezone.utc)
    articles: list[Article] = []
    fetched_count = 0

    from_date = (now - timedelta(days=30)).strftime("%Y-%m-%d")
    to_date = now.strftime("%Y-%m-%d")

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.get(FINNHUB_URL, params={
                "symbol": ticker,
                "from": from_date,
                "to": to_date,
                "token": api_key,
            })
            response.raise_for_status()
            items = response.json()

        fetched_count = len(items)
        for item in items[:MAX_ARTICLES]:
            url = item.get("url", "")
            if not url:
                continue

            article_id = make_id(url)
            if is_duplicate(article_id):
                continue

            article = Article(
                id=article_id,
                ticker=ticker,
                tickers=[ticker],
                source="finnhub",
                content_type="news",
                title=(item.get("headline") or "").strip(),
                summary=(item.get("summary") or "").strip(),
                url=url,
                published_at=datetime.fromtimestamp(item.get("datetime", 0), tz=timezone.utc),
                ingested_at=now,
            )
            mark_seen(article_id)
            articles.append(article)

    except Exception as e:
        print(f"[Finnhub] {ticker}: fetched={fetched_count} saved={len(articles)} error={e}")
        return articles

    print(f"[Finnhub] {ticker}: fetched={fetched_count} saved={len(articles)}")
    return articles
