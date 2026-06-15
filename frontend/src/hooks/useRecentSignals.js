import { useEffect, useRef, useState } from 'react';
import { fetchSignal, ingestTicker } from '../api/signals';

const POLL_MS = 30000;

// Tickers whose signals are already ingested by the backend scheduler —
// no on-demand ingest needed for these.
const DEFAULT_TICKERS = new Set([
  'NVDA', 'AAPL', 'MSFT', 'META', 'TSLA',
  'AMZN', 'AMD',  'GOOGL', 'NFLX', 'PLTR',
]);

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
// For tickers not in DEFAULT_TICKERS, automatically triggers a backend ingest
// before the first poll so cold tickers get data immediately.
//
// Returns { signalsByTicker, ingestStatusByTicker, loading, error }.
// ingestStatusByTicker[ticker] is:
//   'loading'  — ingest POST in flight
//   'error'    — ingest POST failed (signal service unavailable or no articles found)
//   null       — done (or not needed)
export function useRecentSignals(tickers) {
  const [signalsByTicker,      setSignalsByTicker]      = useState({});
  const [ingestStatusByTicker, setIngestStatusByTicker] = useState({});
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  // Stable key so the polling effect re-runs only when the ticker list changes.
  const tickersKey = tickers.join(',');

  // Tracks which non-default tickers have already had an ingest triggered this
  // session so we never fire duplicate POSTs.
  const ingestedRef = useRef(new Set());
  const pollInFlight = useRef(false);

  // ── Polling effect ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!tickers.length) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchAll() {
      if (pollInFlight.current) return;
      pollInFlight.current = true;
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
        pollInFlight.current = false;
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

  // ── On-demand ingest effect ──────────────────────────────────────────────────
  useEffect(() => {
    const toIngest = tickers.filter(
      t => !DEFAULT_TICKERS.has(t) && !ingestedRef.current.has(t),
    );
    if (!toIngest.length) return;

    toIngest.forEach(t => {
      ingestedRef.current.add(t);
      setIngestStatusByTicker(prev => ({ ...prev, [t]: 'loading' }));

      ingestTicker(t)
        .then(signal => {
          // Update signal immediately from the ingest response — no need to wait
          // for the next poll cycle.
          if (signal) {
            setSignalsByTicker(prev => ({ ...prev, [t]: normalizeSignal(signal) }));
          }
          setIngestStatusByTicker(prev => ({ ...prev, [t]: null }));
        })
        .catch(() => {
          setIngestStatusByTicker(prev => ({ ...prev, [t]: 'error' }));
        });
    });
  }, [tickersKey]); // tickersKey is a stable string derived from tickers

  return { signalsByTicker, ingestStatusByTicker, loading, error };
}
