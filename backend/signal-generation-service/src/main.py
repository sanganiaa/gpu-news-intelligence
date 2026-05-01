from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Signal Generation Service")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

@app.get("/health")
def health():
    return {"status": "ok", "service": "signal-generation-service"}

# TODO: GET  /signals/{ticker}   - BUY/HOLD/SELL + confidence score for a ticker
# TODO: GET  /signals/top-picks  - ranked list of best signals right now
# TODO: POST /signals/generate   - generate signal from inference output
# Logic: sentiment score + volatility weighting + historical performance comparison
