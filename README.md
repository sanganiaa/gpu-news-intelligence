# GPU-Accelerated News Intelligence Platform

Real-time financial news ingestion, GPU-powered NLP inference, and actionable trading signal generation.

gpu-news-intelligence.vercel.app 

## Architecture

```
frontend/                   React UI (port 3000)
backend/
  api-gateway/              Node.js — routes all frontend requests (port 4000)
  news-ingestion-service/   Python — pulls from Yahoo Finance, NewsAPI, RSS (port 5001)
  preprocessing-service/    Python — cleans, tokenizes, entity extraction (port 5002)
  inference-engine/         Python + CUDA/MPS — GPU sentiment & classification (port 5003)
  signal-generation-service/Python — buy/hold/sell + confidence scoring (port 5004)
  results-db-service/       Python — stores signals, articles, outcomes (port 5005)
infra/                      Docker, Kubernetes configs
shared/                     Shared schemas and types
```

## GPU Backend

- **Local dev (M1 Mac)**: PyTorch MPS backend
- **Production**: NVIDIA CUDA on AWS EC2 g4dn.xlarge
- Device is controlled by the `DEVICE` env var in docker-compose (`mps` or `cuda`)

## Quick Start

```bash
docker-compose up --build
```

- Frontend: http://localhost:3000
- API Gateway: http://localhost:4000
- Health checks: http://localhost:400{1-5}/health
