import httpx
import os
from datetime import datetime, timezone
from ..schema import Article
from ..dedup import make_id, is_duplicate, mark_seen

NEWSAPI_URL = "https://newsapi.org/v2/everything"

# Company name overrides for better search results
COMPANY_NAMES = {
    "NVDA": "Nvidia", "AAPL": "Apple", "MSFT": "Microsoft",
    "META": "Meta", "TSLA": "Tesla", "AMZN": "Amazon",
    "AMD": "AMD", "SNOW": "Snowflake", "NBIS": "Nebius",
    "PLTR": "Palantir", "ARM": "ARM Holdings", "SMCI": "Super Micro",
    "INTC": "Intel", "QCOM": "Qualcomm", "AVGO": "Broadcom",
    "TSM": "Taiwan Semiconductor", "ASML": "ASML", "ORCL": "Oracle",
    "CRM": "Salesforce", "ADBE": "Adobe", "NOW": "ServiceNow",
}


async def fetch_newsapi(ticker: str) -> list[Article]:
    """
    Fetch latest articles for any ticker from NewsAPI.
    Uses company name if known, falls back to ticker symbol.
    """
    ticker = ticker.upper()
    api_key = os.getenv("NEWSAPI_KEY", "")
    if not api_key:
        print(f"[NewsAPI] {ticker}: disabled missing NEWSAPI_KEY fetched=0 saved=0")
        return []

    company = COMPANY_NAMES.get(ticker, ticker)
    query = f"{company} OR {ticker} stock"
    articles: list[Article] = []
    fetched_count = 0

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.get(NEWSAPI_URL, params={
                "q": query,
                "language": "en",
                "sortBy": "publishedAt",
                "pageSize": 10,
                "apiKey": api_key,
            })
            response.raise_for_status()
            data = response.json()

        if data.get("status") != "ok":
            print(f"[NewsAPI] {ticker}: fetched=0 saved=0 error={data.get('message')}")
            return []

        items = data.get("articles", [])
        fetched_count = len(items)
        for item in items:
            url = item.get("url", "")
            if not url:
                continue

            article_id = make_id(url)
            if is_duplicate(article_id):
                continue

            published_str = item.get("publishedAt", "")
            try:
                published_dt = datetime.fromisoformat(
                    published_str.replace("Z", "+00:00")
                )
            except Exception:
                published_dt = datetime.now(timezone.utc)

            article = Article(
                id=article_id,
                ticker=ticker,
                tickers=[ticker],
                source="newsapi",
                content_type="news",
                title=item.get("title", "").strip(),
                summary=item.get("description", "").strip(),
                url=url,
                published_at=published_dt,
                ingested_at=datetime.now(timezone.utc),
                raw_text=item.get("content", ""),
            )
            mark_seen(article_id)
            articles.append(article)

    except Exception as e:
        print(f"[NewsAPI] {ticker}: fetched={fetched_count} saved={len(articles)} error={e}")
        return articles

    print(f"[NewsAPI] {ticker}: fetched={fetched_count} saved={len(articles)}")
    return articles
