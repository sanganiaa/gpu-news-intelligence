import { request } from './client';

export function fetchTickerHistory(ticker, { limit = 50, contentType } = {}) {
  return request('results', `/results/${ticker}`, { params: { limit, content_type: contentType } });
}

export function fetchSignalAccuracy({ ticker } = {}) {
  return request('results', '/results/signals/accuracy', { params: { ticker } });
}

export function fetchMetrics({ metricName, modelName, ticker, limit = 100 } = {}) {
  return request('results', '/results/metrics', {
    params: {
      metric_name: metricName,
      model_name: modelName,
      ticker,
      limit,
    },
  });
}
