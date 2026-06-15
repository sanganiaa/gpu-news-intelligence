import { useEffect, useRef, useState } from 'react';
import { fetchAllSignals, fetchSignal, ingestTicker } from '../api/signals';

const POLL_MS = 10000; // 10 s — matches the 2-minute backend cycle with fast UI refresh

// Tickers the backend scheduler handles automatically.
// Non-default tickers need an on-demand ingest POST before their first signal fetch.
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
//
// On mount: calls /signals/all to bulk-load all 10 default signals instantly.
// Every 10 s: re-calls /signals/all for defaults + individual GETs for any
//             non-default tickers in the list.
// Non-default tickers automatically trigger an on-demand ingest POST so cold
// tickers get data without waiting for the next scheduler cycle.
//
// Returns { signalsByTicker, ingestStatusByTicker, loading, error }.
export function useRecentSignals(tickers) {
  const [signalsByTicker,      setSignalsByTicker]      = useState({});
  const [ingestStatusByTicker, setIngestStatusByTicker] = useState({});
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const tickersKey = tickers.join(',');
  const ingestedRef   = useRef(new Set());
  const pollInFlight  = useRef(false);

  // ── One-time bulk load on mount ──────────────────────────────────────────────
  useEffect(() => {
    fetchAllSignals()
      .then(allSignals => {
        if (allSignals && typeof allSignals === 'object') {
          setSignalsByTicker(prev => {
            const next = { ...prev };
            Object.entries(allSignals).forEach(([t, signal]) => {
              if (signal) next[t] = normalizeSignal(signal);
            });
            return next;
          });
        }
      })
      .catch(() => {}) // silent: polling below will fill gaps
      .finally(() => setLoading(false));
  }, []); 
  // ── Polling effect (every 10 s) ───────────────────────────────────────────────
  useEffect(() => {
    if (!tickers.length) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    const nonDefaults = tickers.filter(t => !DEFAULT_TICKERS.has(t));

    async function fetchAll() {
      if (pollInFlight.current) return;
      pollInFlight.current = true;
      try {
        // One call for the 10 defaults + individual calls for non-default tickers.
        const [allResult, ...nonDefaultResults] = await Promise.allSettled([
          fetchAllSignals(),
          ...nonDefaults.map(t => fetchSignal(t)),
        ]);

        if (cancelled) return;

        setSignalsByTicker(prev => {
          const next = { ...prev };
          if (allResult.status === 'fulfilled' && allResult.value && typeof allResult.value === 'object') {
            Object.entries(allResult.value).forEach(([t, signal]) => {
              if (signal) next[t] = normalizeSignal(signal);
            });
          }
          nonDefaultResults.forEach((r, i) => {
            if (r.status === 'fulfilled' && r.value) {
              next[nonDefaults[i]] = normalizeSignal(r.value);
            }
          });
          return next;
        });

        const firstErr = [allResult, ...nonDefaultResults].find(r => r.status === 'rejected');
        setError(firstErr ? firstErr.reason : null);
      } finally {
        pollInFlight.current = false;
        if (!cancelled) setLoading(false);
      }
    }

    fetchAll();
    const id = setInterval(fetchAll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [tickersKey]); 
  // ── On-demand ingest for non-default tickers ─────────────────────────────────
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
          if (signal) {
            setSignalsByTicker(prev => ({ ...prev, [t]: normalizeSignal(signal) }));
          }
          setIngestStatusByTicker(prev => ({ ...prev, [t]: null }));
        })
        .catch(() => {
          setIngestStatusByTicker(prev => ({ ...prev, [t]: 'error' }));
        });
    });
  }, [tickersKey]); 
  return { signalsByTicker, ingestStatusByTicker, loading, error };
}
