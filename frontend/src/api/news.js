import { request } from './client';

/**
 * Article shape from news-ingestion-service:
 * id, ticker, source, title, summary, url, published_at, ingested_at,
 * raw_text, is_filing, filing_type.
 */
export function fetchLatestArticles(limit = 50) {
  return request('news', '/news/latest', { params: { limit } });
}

export function fetchArticlesByTicker(ticker, { limit = 20, refresh = false } = {}) {
  return request('news', `/news/${ticker}`, { params: { limit, refresh } });
}

export function fetchNewsTickers() {
  return request('news', '/news/tickers');
}

export function fetchSourceStatus() {
  return request('news', '/news/sources/status');
}
