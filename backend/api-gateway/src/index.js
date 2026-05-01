const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'api-gateway' }));

// TODO: proxy routes
// GET /api/news/latest          -> news-ingestion-service
// GET /api/news/:ticker         -> news-ingestion-service
// GET /api/inference/sentiment  -> inference-engine
// GET /api/signals/:ticker      -> signal-generation-service
// GET /api/signals/top-picks    -> signal-generation-service
// GET /api/results/:ticker      -> results-db-service

app.listen(process.env.PORT || 4000, () =>
  console.log(`API Gateway running on port ${process.env.PORT || 4000}`)
);
