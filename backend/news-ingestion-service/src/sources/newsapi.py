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
    api_key = os.getenv("NEWSAPI_KEY", "")
    if not api_key:
        print("[NewsAPI] No API key set — skipping")
        return []

    company = COMPANY_NAMES.get(ticker.upper(), ticker.upper())
    query = f"{company} OR {ticker.upper()} stock"
    articles = []

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.get(NEWSAPI_URL, params={
                "q": query,
                "language": "en",
                "sortBy": "publishedAt",
                "pageSize": 10,
                "apiKey": api_key,
            })
            data = response.json()

        if data.get("status") != "ok":
            print(f"[NewsAPI] Error response for {ticker}: {data.get('message')}")
            return []

        for item in data.get("articles", []):
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
                ticker=ticker.upper(),
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
        print(f"[NewsAPI] Error fetching {ticker}: {e}")

    return articles
