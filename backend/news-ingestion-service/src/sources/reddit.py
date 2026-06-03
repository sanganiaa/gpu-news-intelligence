import re
from datetime import datetime, timezone

import feedparser
import httpx

from ..dedup import is_duplicate, make_id, mark_seen
from ..schema import Article

RSS_FEEDS = [
    "https://www.reddit.com/r/investing/top.rss?t=day",
    "https://www.reddit.com/r/stocks/top.rss?t=day",
    "https://www.reddit.com/r/wallstreetbets/top.rss?t=day",
]

# Reddit's JSON API returns 403 for bots; RSS feeds work with a browser UA.
HEADERS = {"User-Agent": "Mozilla/5.0"}

TRACKED_TICKERS = {
    "NVDA", "AAPL", "MSFT", "META", "TSLA", "AMZN", "AMD", "SNOW", "PLTR",
    "SMCI", "INTC", "QCOM", "ARM",  "AVGO", "TSM",  "ASML", "ORCL", "CRM",
    "ADBE", "NOW",
}

# Pre-compile one pattern per ticker. Word-boundary match handles "NVDA" vs
# "VNVDA"; also accept the common "$TICKER" notation used on finance subs.
_TICKER_PATTERNS = {
    ticker: re.compile(rf"(?<![A-Z])\$?{re.escape(ticker)}(?![A-Z])")
    for ticker in TRACKED_TICKERS
}


def _find_tickers(title: str) -> list[str]:
    upper = title.upper()
    return [t for t, pat in _TICKER_PATTERNS.items() if pat.search(upper)]


def _parse_published(entry) -> datetime:
    try:
        if entry.get("published_parsed"):
            return datetime(*entry.published_parsed[:6], tzinfo=timezone.utc)
    except Exception:
        pass
    return datetime.now(timezone.utc)


def _strip_html(text: str) -> str:
    return re.sub(r"<[^>]+>", "", text or "").strip()


async def fetch_reddit_top_posts(limit_per_subreddit: int = 10) -> list[Article]:
    """Fetch top posts from finance subreddits via Reddit RSS feeds."""
    articles: list[Article] = []
    fetched_count = 0

    try:
        async with httpx.AsyncClient(timeout=10, headers=HEADERS, follow_redirects=True) as client:
            for feed_url in RSS_FEEDS:
                subreddit = feed_url.split("/r/")[1].split("/")[0]

                try:
                    response = await client.get(feed_url)
                    response.raise_for_status()
                except Exception as e:
                    print(f"[Reddit] r/{subreddit}: request failed — {e}")
                    continue

                feed = feedparser.parse(response.text)
                entries = feed.entries[:limit_per_subreddit]
                fetched_count += len(entries)

                for entry in entries:
                    title = _strip_html(getattr(entry, "title", "") or "").strip()
                    if not title:
                        continue

                    tickers = _find_tickers(title)
                    if not tickers:
                        continue

                    url = getattr(entry, "link", "") or ""
                    if not url:
                        continue

                    article_id = make_id(url)
                    if is_duplicate(article_id):
                        continue

                    summary = _strip_html(getattr(entry, "summary", "") or "")
                    if not summary:
                        summary = f"r/{subreddit} post mentioning {', '.join(tickers)}"

                    article = Article(
                        id=article_id,
                        ticker=tickers[0],
                        tickers=tickers,
                        source="reddit",
                        content_type="reddit",
                        title=title,
                        summary=summary,
                        url=url,
                        published_at=_parse_published(entry),
                        ingested_at=datetime.now(timezone.utc),
                        raw_text=summary,
                    )
                    mark_seen(article_id)
                    articles.append(article)

    except Exception as e:
        print(f"[Reddit] fetched={fetched_count} saved={len(articles)} error={e}")
        return articles

    print(f"[Reddit] fetched={fetched_count} saved={len(articles)}")
    return articles
