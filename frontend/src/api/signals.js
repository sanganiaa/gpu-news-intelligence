import { request } from './client';

export function fetchTopPicks(limit = 12) {
  return request('signals', '/signals/top-picks', { params: { limit }, timeoutMs: 30000 });
}

// Returns all 10 default-ticker signals in one round-trip.
// Shape: { "NVDA": Signal, "AAPL": Signal, ... } (only tickers with a cached signal are included)
export function fetchAllSignals() {
  return request('signals', '/signals/all', { timeoutMs: 15000 });
}

export function fetchSignal(ticker, { refresh = false } = {}) {
  return request('signals', `/signals/${ticker}`, { params: { refresh }, timeoutMs: 30000 });
}

// Triggers a full ingest cycle for a single ticker on the backend and returns the
// resulting signal. Can take 10–30 s for a cold ticker; use a generous timeout.
export function ingestTicker(ticker) {
  return request('signals', `/signals/ingest/${ticker}`, {
    method: 'POST',
    timeoutMs: 60000,
  });
}

export function generateSignal(payload) {
  return request('signals', '/signals/generate', {
    method: 'POST',
    body: payload,
    timeoutMs: 15000,
  });
}
