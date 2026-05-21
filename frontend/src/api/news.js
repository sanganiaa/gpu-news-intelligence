import { request } from './client';

/**
 * Article shape from news-ingestion-service:
 * id, ticker, source, title, summary, url, published_at, ingested_at,
 * raw_text, is_filing, filing_type, content_type.
 */
export function fetchLatestArticles(limit = 50, { contentType } = {}) {
  return request('news', '/news/latest', { params: { limit, content_type: contentType } });
}

export function fetchArticlesByTicker(ticker, { limit = 20, refresh = false, contentType } = {}) {
  return request('news', `/news/${ticker}`, { params: { limit, refresh, content_type: contentType } });
}

export function fetchArticles({ limit = 50, ticker, contentType } = {}) {
  return request('news', '/articles', { params: { limit, ticker, content_type: contentType } });
}

export function fetchNewsTickers() {
  return request('news', '/news/tickers');
}

export function fetchSourceStatus() {
  return request('news', '/news/sources/status');
}
