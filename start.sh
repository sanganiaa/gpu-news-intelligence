#!/bin/bash
echo "Stopping any running services..."
lsof -ti:5001,5002,5003,5004,5005 | xargs kill -9 2>/dev/null
sleep 2

echo "Starting services..."
cd ~/gpu-news-intelligence/backend/news-ingestion-service && uvicorn src.main:app --port 5001 &
sleep 1
cd ~/gpu-news-intelligence/backend/preprocessing-service && uvicorn src.main:app --port 5002 &
sleep 1
cd ~/gpu-news-intelligence/backend/inference-engine && source venv/bin/activate 2>/dev/null && uvicorn src.main:app --port 5003 &
sleep 1
cd ~/gpu-news-intelligence/backend/signal-generation-service && uvicorn src.main:app --port 5004 &
sleep 1
cd ~/gpu-news-intelligence/backend/results-db-service && uvicorn src.main:app --port 5005 &

echo "Waiting 20 seconds for services to start..."
sleep 20

echo "Seeding signals..."
for ticker in NVDA AAPL MSFT META TSLA AMZN AMD SNOW PLTR SMCI; do
  curl -s -X POST localhost:5004/signals/ingest/$ticker > /dev/null && echo "$ticker seeded"
done

echo ""
echo "All done! Run: cd ~/gpu-news-intelligence/frontend && npm start"
