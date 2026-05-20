import { request } from './client';

export function fetchInferenceHealth() {
  return request('inference', '/health', { timeoutMs: 4000 });
}

export function inferSentiment(article) {
  return request('inference', '/inference/sentiment', {
    method: 'POST',
    body: article,
    timeoutMs: 15000,
  });
}

export function inferBatchSentiment(articles) {
  return request('inference', '/inference/batch', {
    method: 'POST',
    body: { articles },
    timeoutMs: 30000,
  });
}

export function classifyArticle(article) {
  return request('inference', '/inference/classify', {
    method: 'POST',
    body: article,
    timeoutMs: 15000,
  });
}

export function fetchInferenceBenchmark() {
  return request('inference', '/inference/benchmark', { timeoutMs: 30000 });
}
