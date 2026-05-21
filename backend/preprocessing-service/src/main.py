from datetime import datetime, timezone
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .schema import Article, ProcessedArticle
from .cleaner import clean
from .nlp import process as nlp_process
from .ticker_matcher import find_tickers
from .summarizer import summarize

app = FastAPI(title="Preprocessing Service")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def _preprocess(article: Article) -> ProcessedArticle:
    """Core pipeline: clean → NLP → ticker match → assemble ProcessedArticle."""
    # Combine title + summary + raw_text; title is always present
    raw = " ".join(
        part
        for part in [article.title, article.summary, article.raw_text]
        if part
    )

    clean_text = clean(raw)

    if not clean_text:
        raise ValueError(f"Article {article.id} produced empty clean_text")

    tokens, entities = nlp_process(clean_text)
    mentioned_tickers = find_tickers(clean_text, base_ticker=article.ticker)

    summary_ai, investment_implication, catalyst_tag = None, None, None
    try:
        summary_ai, investment_implication, catalyst_tag = summarize(
            title=article.title,
            text=clean_text,
        )
    except Exception as exc:
        print(f"[preprocessing] summarization failed for {article.id}: {exc}")

    return ProcessedArticle(
        id=article.id,
        ticker=article.ticker,
        source=article.source,
        title=article.title,
        url=article.url,
        published_at=article.published_at,
        ingested_at=article.ingested_at,
        is_filing=article.is_filing,
        filing_type=article.filing_type,
        clean_text=clean_text,
        tokens=tokens,
        entities=entities,
        mentioned_tickers=mentioned_tickers,
        word_count=len(tokens),
        processed_at=datetime.now(timezone.utc),
        summary_ai=summary_ai,
        investment_implication=investment_implication,
        catalyst_tag=catalyst_tag,
    )


@app.get("/health")
def health():
    return {"status": "ok", "service": "preprocessing-service"}


@app.post("/preprocess", response_model=ProcessedArticle)
def preprocess_one(article: Article):
    """
    Accept a single raw Article from the ingestion service and return a
    ProcessedArticle enriched with clean text, tokens, NER entities, and
    matched ticker symbols.
    """
    try:
        return _preprocess(article)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))


@app.post("/preprocess/batch", response_model=list[ProcessedArticle])
def preprocess_batch(articles: list[Article]):
    """
    Batch-process up to 200 articles.  Articles that fail processing are
    skipped; the response contains only successfully processed articles.
    """
    if len(articles) > 200:
        raise HTTPException(
            status_code=400,
            detail="Batch size exceeds limit of 200 articles",
        )

    results: list[ProcessedArticle] = []
    errors: list[str] = []

    for article in articles:
        try:
            results.append(_preprocess(article))
        except Exception as exc:
            errors.append(f"{article.id}: {exc}")

    if errors:
        # Log but don't fail the whole batch
        for err in errors:
            print(f"[preprocessing] skipped article — {err}")

    return results
