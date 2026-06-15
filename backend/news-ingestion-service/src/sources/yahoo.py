import feedparser
import httpx
from datetime import datetime, timezone
from typing import Optional
from urllib.parse import quote_plus
from ..schema import Article
from ..dedup import make_id, is_duplicate, mark_seen

GOOGLE_NEWS_RSS = "https://news.google.com/rss/search?q={query}&hl=en-US&gl=US&ceid=US:en"
MAX_ARTICLES = 5

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0 Safari/537.36 gpu-news-intelligence/1.0"
    ),
    "Accept": "application/rss+xml, application/xml;q=0.9, text/xml;q=0.8, */*;q=0.7",
}


async def fetch_yahoo_rss(ticker: str, since: Optional[datetime] = None) -> list[Article]:
    """Fetch Google News RSS stories for a ticker (Yahoo Finance RSS returns 429).

    If *since* is provided, articles published at or before that timestamp are
    skipped so each cycle only processes genuinely new content.
    """
    ticker = ticker.upper()
    articles: list[Article] = []
    fetched_count = 0

    query = quote_plus(f"{ticker} stock OR {ticker} earnings")
    url = GOOGLE_NEWS_RSS.format(query=query)

    try:
        async with httpx.AsyncClient(timeout=15, headers=HEADERS) as client:
            response = await client.get(url, follow_redirects=True)
            if response.status_code >= 400:
                print(f"[Yahoo] {ticker}: Google News RSS returned {response.status_code} fetched=0 saved=0")
                return []

            parsed = feedparser.parse(response.text)
            entries = list(parsed.entries or [])
            fetched_count = len(entries)

            # Filter to articles newer than the last successful fetch.
            if since:
                def _entry_dt(entry) -> datetime:
                    p = entry.get("published_parsed")
                    return datetime(*p[:6], tzinfo=timezone.utc) if p else datetime.now(timezone.utc)
                entries = [e for e in entries if _entry_dt(e) > since]

            for entry in entries[:MAX_ARTICLES]:
                title = entry.get("title", "")
                link = entry.get("link", "")
                if not title or not link:
                    continue

                article_id = make_id(link)
                if is_duplicate(article_id):
                    continue

                published = entry.get("published_parsed")
                published_dt = (
                    datetime(*published[:6], tzinfo=timezone.utc)
                    if published else datetime.now(timezone.utc)
                )

                article = Article(
                    id=article_id,
                    ticker=ticker,
                    tickers=[ticker],
                    source="yahoo_rss",
                    content_type="news",
                    title=title.strip(),
                    summary=entry.get("summary", "").strip(),
                    url=link,
                    published_at=published_dt,
                    ingested_at=datetime.now(timezone.utc),
                )
                mark_seen(article_id)
                articles.append(article)

    except Exception as e:
        print(f"[Yahoo] {ticker}: fetched={fetched_count} saved={len(articles)} error={e}")
        return articles

    print(f"[Yahoo] {ticker}: fetched={fetched_count} saved={len(articles)}")
    return articles
