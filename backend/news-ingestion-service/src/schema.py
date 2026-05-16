from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class Article(BaseModel):
    """
    Normalized article schema.
    Every source (Yahoo RSS, NewsAPI, SEC EDGAR) outputs this same shape
    so downstream services never need to know where the article came from.
    """
    id: str                              # SHA256 hash of URL — used for dedup
    ticker: str                          # e.g. "NVDA"
    source: str                          # "yahoo_rss" | "newsapi" | "sec_edgar"
    title: str
    summary: Optional[str] = None
    url: str
    published_at: datetime
    ingested_at: datetime
    raw_text: Optional[str] = None       # full body if available
    is_filing: bool = False              # True for SEC 8-K filings
    filing_type: Optional[str] = None   # "8-K", "10-K", etc.
