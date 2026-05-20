import { request } from './client';

export function fetchTopPicks(limit = 12) {
  return request('signals', '/signals/top-picks', { params: { limit }, timeoutMs: 30000 });
}

export function fetchSignal(ticker, { refresh = false } = {}) {
  return request('signals', `/signals/${ticker}`, { params: { refresh }, timeoutMs: 30000 });
}

export function generateSignal(payload) {
  return request('signals', '/signals/generate', {
    method: 'POST',
    body: payload,
    timeoutMs: 15000,
  });
}
