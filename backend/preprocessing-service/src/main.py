from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Preprocessing Service")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

@app.get("/health")
def health():
    return {"status": "ok", "service": "preprocessing-service"}

# TODO: POST /preprocess         - accepts raw article, returns cleaned + tokenized text
# TODO: POST /preprocess/batch   - batch process multiple articles
# Steps: text cleaning, stop-word removal, tokenization, NER (spaCy), ticker matching
