import { useEffect, useRef, useState } from 'react';
import { fetchSignal } from '../api/signals';

const POLL_MS = 30000;

function normalizeSignal(signal) {
  if (!signal) return null;
  return {
    ...signal,
    ticker: String(signal.ticker || '').toUpperCase(),
    verdict: signal.verdict || signal.signal || 'HOLD',
    net_sentiment: Number(signal.net_sentiment ?? signal.sentiment_score ?? 0),
    confidence: Number(signal.confidence ?? 0),
    article_count: Number(
      signal.article_count ??
      signal.article_ids?.length ??
      signal.supporting_articles?.length ??
      0,
    ),
    supporting_articles: signal.supporting_articles || [],
  };
}

// Fetches and polls signals for an ordered list of tickers.
// Returns { signalsByTicker, loading, error }.
export function useRecentSignals(tickers) {
  const [signalsByTicker, setSignalsByTicker] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Stable key so the effect re-runs only when the ticker list actually changes
  const tickersKey = tickers.join(',');
  const inFlight = useRef(false);

  useEffect(() => {
    if (!tickers.length) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchAll() {
      if (inFlight.current) return;
      inFlight.current = true;

      try {
        const results = await Promise.allSettled(tickers.map(t => fetchSignal(t)));
        if (cancelled) return;

        const firstErr = results.find(r => r.status === 'rejected');
        setError(firstErr ? firstErr.reason : null);

        setSignalsByTicker(prev => {
          const next = { ...prev };
          results.forEach((r, i) => {
            if (r.status === 'fulfilled' && r.value) {
              next[tickers[i]] = normalizeSignal(r.value);
            }
          });
          return next;
        });
      } finally {
        inFlight.current = false;
        if (!cancelled) setLoading(false);
      }
    }

    setLoading(true);
    fetchAll();
    const id = setInterval(fetchAll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [tickersKey]); // tickersKey is a stable string derived from tickers

  return { signalsByTicker, loading, error };
}
