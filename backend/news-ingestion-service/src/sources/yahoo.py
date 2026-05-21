import feedparser
import httpx
from datetime import datetime, timezone
from urllib.parse import quote_plus
from ..schema import Article
from ..dedup import make_id, is_duplicate, mark_seen

YAHOO_RSS_URLS = (
    "https://finance.yahoo.com/rss/headline?s={ticker}",
    "https://feeds.finance.yahoo.com/rss/2.0/headline?s={ticker}&region=US&lang=en-US",
    "https://news.google.com/rss/search?q={query}&hl=en-US&gl=US&ceid=US:en",
)
YAHOO_SEARCH_URL = "https://query1.finance.yahoo.com/v1/finance/search"
MAX_ARTICLES = 20

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0 Safari/537.36 gpu-news-intelligence/1.0"
    ),
    "Accept": "application/rss+xml, application/xml;q=0.9, text/xml;q=0.8, */*;q=0.7",
}
JSON_HEADERS = {
    "User-Agent": "Mozilla/5.0",
    "Accept": "application/json, text/plain, */*",
}


def _published_from_epoch(value) -> datetime:
    try:
        return datetime.fromtimestamp(float(value), tz=timezone.utc)
    except Exception:
        return datetime.now(timezone.utc)


def _article_from_payload(
    *,
    ticker: str,
    title: str,
    summary: str,
    url: str,
    published_at: datetime,
) -> Article | None:
    if not title or not url:
        return None

    article_id = make_id(url)
    if is_duplicate(article_id):
        return None

    article = Article(
        id=article_id,
        ticker=ticker,
        tickers=[ticker],
        source="yahoo_rss",
        content_type="news",
        title=title.strip(),
        summary=summary.strip(),
        url=url,
        published_at=published_at,
        ingested_at=datetime.now(timezone.utc),
    )
    mark_seen(article_id)
    return article


async def fetch_yahoo_rss(ticker: str) -> list[Article]:
    """Fetch latest Yahoo Finance stories for any ticker."""
    ticker = ticker.upper()
    articles: list[Article] = []
    fetched_count = 0
    selected_url = ""

    async with httpx.AsyncClient(timeout=15, headers=HEADERS) as client:
        try:
            entries = []
            query = quote_plus(f"{ticker} stock OR {ticker} earnings")
            for template in YAHOO_RSS_URLS:
                url = template.format(ticker=ticker, query=query)
                response = await client.get(url, follow_redirects=True)
                if response.status_code >= 400:
                    print(f"[Yahoo RSS] {ticker}: {url} returned {response.status_code}")
                    continue
                parsed = feedparser.parse(response.text)
                entries = list(parsed.entries or [])
                selected_url = url
                if entries:
                    break

            fetched_count = len(entries)
            for entry in entries[:MAX_ARTICLES]:
                published = entry.get("published_parsed")
                published_dt = (
                    datetime(*published[:6], tzinfo=timezone.utc)
                    if published else datetime.now(timezone.utc)
                )
                article = _article_from_payload(
                    ticker=ticker,
                    title=entry.get("title", ""),
                    summary=entry.get("summary", ""),
                    url=entry.get("link", ""),
                    published_at=published_dt,
                )
                if article:
                    articles.append(article)
        except Exception as e:
            print(f"[Yahoo RSS] {ticker}: fetched={fetched_count} saved={len(articles)} error={e}")

        if not articles:
            try:
                response = await client.get(
                    YAHOO_SEARCH_URL,
                    params={"q": ticker, "newsCount": 20, "quotesCount": 0},
                    headers=JSON_HEADERS,
                )
                response.raise_for_status()
                news_items = response.json().get("news", [])
                fetched_count = len(news_items)
                selected_url = YAHOO_SEARCH_URL

                for item in news_items[:MAX_ARTICLES]:
                    article = _article_from_payload(
                        ticker=ticker,
                        title=item.get("title", ""),
                        summary=item.get("publisher", ""),
                        url=item.get("link", ""),
                        published_at=_published_from_epoch(item.get("providerPublishTime")),
                    )
                    if article:
                        articles.append(article)
            except Exception as e:
                print(f"[Yahoo Search] {ticker}: fetched={fetched_count} saved={len(articles)} error={e}")

    print(
        f"[Yahoo] {ticker}: fetched={fetched_count} saved={len(articles)} "
        f"url={selected_url}"
    )
    return articles
