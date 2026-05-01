from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Results DB Service")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

@app.get("/health")
def health():
    return {"status": "ok", "service": "results-db-service"}

# TODO: POST /results/signal     - store generated signal
# TODO: POST /results/article    - store ingested article
# TODO: GET  /results/{ticker}   - fetch stored signals + outcomes for backtesting
# TODO: GET  /results/metrics    - model performance metrics, system logs
