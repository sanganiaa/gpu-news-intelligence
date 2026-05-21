import feedparser
import httpx
from datetime import datetime, timezone
from ..schema import Article
from ..dedup import make_id, is_duplicate, mark_seen

YAHOO_RSS_URL = "https://finance.yahoo.com/rss/headline?s={ticker}"


async def fetch_yahoo_rss(ticker: str) -> list[Article]:
    """Fetch latest articles for any ticker from Yahoo Finance RSS."""
    url = YAHOO_RSS_URL.format(ticker=ticker)
    articles = []

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.get(url, follow_redirects=True)
        feed = feedparser.parse(response.text)

        for entry in feed.entries:
            link = entry.get("link", "")
            if not link:
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
                ticker=ticker.upper(),
                source="yahoo_rss",
                content_type="news",
                title=entry.get("title", "").strip(),
                summary=entry.get("summary", "").strip(),
                url=link,
                published_at=published_dt,
                ingested_at=datetime.now(timezone.utc),
            )
            mark_seen(article_id)
            articles.append(article)

    except Exception as e:
        print(f"[Yahoo RSS] Error fetching {ticker}: {e}")

    return articles
