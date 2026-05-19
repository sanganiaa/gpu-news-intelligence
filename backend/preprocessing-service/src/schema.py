from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class Article(BaseModel):
    """
    Normalized article schema — mirrors news-ingestion-service/src/schema.py exactly.
    Used as the input type for preprocessing endpoints.
    """
    id: str
    ticker: str
    source: str
    title: str
    summary: Optional[str] = None
    url: str
    published_at: datetime
    ingested_at: datetime
    raw_text: Optional[str] = None
    is_filing: bool = False
    filing_type: Optional[str] = None


class NamedEntity(BaseModel):
    text: str
    label: str  # ORG, PERSON, GPE, PRODUCT, etc.
    start: int  # char offset in clean_text
    end: int


class ProcessedArticle(BaseModel):
    """
    Enriched article ready for the inference engine.
    Carries the original identifiers plus all NLP-derived fields.
    """
    # Original identity fields
    id: str
    ticker: str
    source: str
    title: str
    url: str
    published_at: datetime
    ingested_at: datetime
    is_filing: bool
    filing_type: Optional[str] = None

    # NLP outputs
    clean_text: str          # HTML-stripped, lowercased, whitespace-normalised
    tokens: list[str]        # meaningful tokens after stop-word removal
    entities: list[NamedEntity]
    mentioned_tickers: list[str]  # tickers found via company-name lookup

    word_count: int
    processed_at: datetime
