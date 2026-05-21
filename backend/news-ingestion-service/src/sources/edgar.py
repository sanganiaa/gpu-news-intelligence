import httpx
from datetime import datetime, timezone
from ..schema import Article
from ..dedup import make_id, is_duplicate, mark_seen

EDGAR_COMPANY_SEARCH = "https://efts.sec.gov/LATEST/search-index?q=%22{ticker}%22&dateRange=custom&startdt=2020-01-01&forms=8-K"
EDGAR_SUBMISSIONS = "https://data.sec.gov/submissions/CIK{cik}.json"

HEADERS = {
    # SEC requires a descriptive user-agent
    "User-Agent": "gpu-news-intelligence aayushsangani@gmail.com"
}

# Cache CIK lookups so we don't hit SEC repeatedly for same ticker
_cik_cache: dict = {}

# Known CIKs for common tickers — avoids lookup for these
KNOWN_CIKS = {
    "NVDA": "0001045810", "AAPL": "0000320193", "MSFT": "0000789019",
    "META": "0001326801", "TSLA": "0001318605", "AMZN": "0001018724",
    "AMD":  "0000002488", "SNOW": "0001640147", "NBIS": "0002024173",
    "PLTR": "0001321655", "ARM":  "0001824814", "SMCI": "0001375365",
    "INTC": "0000050863", "QCOM": "0000804328", "AVGO": "0001730168",
    "TSM":  "0001046179", "ASML": "0000937966", "ORCL": "0001341439",
    "CRM":  "0001108524", "ADBE": "0000796343", "NOW":  "0001373715",
}


async def get_cik(ticker: str) -> str | None:
    """
    Resolve ticker to SEC CIK number.
    Checks known list first, then does a live EDGAR company search.
    """
    ticker = ticker.upper()

    if ticker in KNOWN_CIKS:
        return KNOWN_CIKS[ticker]

    if ticker in _cik_cache:
        return _cik_cache[ticker]

    try:
        # EDGAR company search API — searches by ticker symbol
        search_url = f"https://www.sec.gov/cgi-bin/browse-edgar?company=&CIK={ticker}&type=8-K&dateb=&owner=include&count=1&search_text=&action=getcompany&output=atom"
        async with httpx.AsyncClient(timeout=10, headers=HEADERS) as client:
            resp = await client.get(search_url)

        # Parse CIK from response — it appears as /cgi-bin/browse-edgar?action=getcompany&CIK=XXXXXXXXXX
        import re
        match = re.search(r'CIK=(\d{10})', resp.text)
        if match:
            cik = match.group(1)
            _cik_cache[ticker] = cik
            print(f"[EDGAR] Resolved {ticker} → CIK {cik}")
            return cik

    except Exception as e:
        print(f"[EDGAR] CIK lookup failed for {ticker}: {e}")

    return None


async def fetch_edgar_8k(ticker: str) -> list[Article]:
    """
    Fetch recent 8-K filings for any ticker from SEC EDGAR.
    Resolves CIK dynamically so any ticker works.
    """
    cik = await get_cik(ticker)
    if not cik:
        print(f"[EDGAR] Could not resolve CIK for {ticker} — skipping")
        return []

    cik_stripped = cik.lstrip("0")
    articles = []

    try:
        async with httpx.AsyncClient(timeout=15, headers=HEADERS) as client:
            response = await client.get(EDGAR_SUBMISSIONS.format(cik=cik))
            data = response.json()

        filings = data.get("filings", {}).get("recent", {})
        forms            = filings.get("form", [])
        accession_numbers = filings.get("accessionNumber", [])
        filing_dates     = filings.get("filingDate", [])
        primary_docs     = filings.get("primaryDocument", [])

        for i, form in enumerate(forms):
            if form != "8-K":
                continue

            accession        = accession_numbers[i]
            accession_no_dashes = accession.replace("-", "")
            primary_doc      = primary_docs[i]
            filing_date_str  = filing_dates[i]

            url = f"https://www.sec.gov/Archives/edgar/data/{cik_stripped}/{accession_no_dashes}/{primary_doc}"
            article_id = make_id(url)

            if is_duplicate(article_id):
                continue

            try:
                published_dt = datetime.strptime(
                    filing_date_str, "%Y-%m-%d"
                ).replace(tzinfo=timezone.utc)
            except Exception:
                published_dt = datetime.now(timezone.utc)

            article = Article(
                id=article_id,
                ticker=ticker.upper(),
                source="sec_edgar",
                content_type="sec_filing",
                title=f"{ticker.upper()} 8-K Filing — {filing_date_str}",
                summary=f"SEC 8-K filing. Accession: {accession}",
                url=url,
                published_at=published_dt,
                ingested_at=datetime.now(timezone.utc),
                is_filing=True,
                filing_type="8-K",
            )
            mark_seen(article_id)
            articles.append(article)

            if len(articles) >= 5:
                break

    except Exception as e:
        print(f"[EDGAR] Error fetching filings for {ticker}: {e}")

    return articles
