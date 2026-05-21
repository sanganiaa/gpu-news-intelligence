#!/bin/bash
echo "Starting GPU News Intelligence Platform..."

cd ~/gpu-news-intelligence/backend/news-ingestion-service && uvicorn src.main:app --port 5001 &
sleep 1
cd ~/gpu-news-intelligence/backend/preprocessing-service && uvicorn src.main:app --port 5002 &
sleep 1
cd ~/gpu-news-intelligence/backend/inference-engine && uvicorn src.main:app --port 5003 &
sleep 1
cd ~/gpu-news-intelligence/backend/signal-generation-service && uvicorn src.main:app --port 5004 &
sleep 1
cd ~/gpu-news-intelligence/backend/results-db-service && uvicorn src.main:app --port 5005 &

echo "Waiting 15 seconds for services to start..."
sleep 15

echo "Seeding signals..."
for ticker in NVDA AAPL MSFT META TSLA AMZN AMD SNOW PLTR SMCI; do
  curl -s -X POST localhost:5004/signals/ingest/$ticker > /dev/null
  echo "$ticker seeded"
done

echo ""
echo "All done! Open http://localhost:3000"
echo "To start frontend: cd ~/gpu-news-intelligence/frontend && npm start"
