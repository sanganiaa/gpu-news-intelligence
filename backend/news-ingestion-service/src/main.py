from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="News Ingestion Service")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

@app.get("/health")
def health():
    return {"status": "ok", "service": "news-ingestion-service"}

# TODO: GET /news/latest         - fetch latest articles from NewsAPI + Yahoo Finance RSS
# TODO: GET /news/{ticker}       - fetch articles for a specific ticker
# TODO: POST /news/ingest        - manually trigger ingestion cycle
# TODO: dedup, normalize timestamps, prioritize high-impact sources
