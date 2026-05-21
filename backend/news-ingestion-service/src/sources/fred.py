import os
from datetime import datetime, timezone

import httpx

from ..dedup import is_duplicate, make_id, mark_seen
from ..schema import Article

FRED_OBSERVATIONS_URL = "https://api.stlouisfed.org/fred/series/observations"

INDICATORS = {
    "CPIAUCSL": {
        "name": "Consumer Price Index",
        "label": "CPI",
        "units": "index",
    },
    "UNRATE": {
        "name": "Unemployment Rate",
        "label": "Unemployment",
        "units": "percent",
    },
    "FEDFUNDS": {
        "name": "Federal Funds Rate",
        "label": "Federal funds rate",
        "units": "percent",
    },
}


def _parse_fred_date(value: str) -> datetime:
    try:
        return datetime.strptime(value, "%Y-%m-%d").replace(tzinfo=timezone.utc)
    except Exception:
        return datetime.now(timezone.utc)


async def fetch_fred_indicators() -> list[Article]:
    """
    Fetch latest macro indicators from FRED.
    Requires FRED_API_KEY from https://fred.stlouisfed.org/docs/api/api_key.html.
    """
    api_key = os.getenv("FRED_API_KEY", "")
    if not api_key:
        print("[FRED] No API key set — skipping")
        return []

    articles: list[Article] = []

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            for series_id, meta in INDICATORS.items():
                response = await client.get(
                    FRED_OBSERVATIONS_URL,
                    params={
                        "series_id": series_id,
                        "api_key": api_key,
                        "file_type": "json",
                        "sort_order": "desc",
                        "limit": 1,
                    },
                )
                data = response.json()

                observations = data.get("observations", [])
                if not observations:
                    continue

                latest = observations[0]
                value = latest.get("value", "")
                date = latest.get("date", "")
                if value in {"", "."}:
                    continue

                url = f"https://fred.stlouisfed.org/series/{series_id}"
                article_id = make_id(f"{url}:{date}:{value}")
                if is_duplicate(article_id):
                    continue

                published_dt = _parse_fred_date(date)
                units = meta["units"]
                title = f"{meta['label']}: {value} {units} ({date})"

                article = Article(
                    id=article_id,
                    ticker="MACRO",
                    source="fred",
                    content_type="macro",
                    title=title,
                    summary=f"Latest FRED observation for {meta['name']} ({series_id}).",
                    url=url,
                    published_at=published_dt,
                    ingested_at=datetime.now(timezone.utc),
                    raw_text=str(latest),
                )
                mark_seen(article_id)
                articles.append(article)

    except Exception as e:
        print(f"[FRED] Error fetching indicators: {e}")

    return articles
