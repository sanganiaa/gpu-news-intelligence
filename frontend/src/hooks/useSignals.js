import { useEffect, useMemo, useState } from 'react';
import { fetchSignal, fetchTopPicks } from '../api/signals';

const SIGNAL_POLL_MS = 30000;

function normalizeSignal(signal) {
  if (!signal) return signal;
  return {
    ...signal,
    ticker: String(signal.ticker || '').toUpperCase(),
    verdict: signal.verdict || signal.signal || 'HOLD',
    net_sentiment: Number(signal.net_sentiment ?? signal.sentiment_score ?? 0),
    confidence: Number(signal.confidence ?? 0),
    article_count: Number(signal.article_count ?? signal.article_ids?.length ?? signal.supporting_articles?.length ?? 0),
    supporting_articles: signal.supporting_articles || [],
  };
}

export function useSignals(ticker) {
  const [state, setState] = useState({
    selected: null,
    topPicks: [],
    loading: true,
    error: null,
    updatedAt: null,
  });

  useEffect(() => {
    let cancelled = false;
    let inFlight = false;

    function loadSignals({ initial = false } = {}) {
      if (inFlight) return;
      inFlight = true;
      if (initial) setState(prev => ({ ...prev, loading: true, error: null }));

      Promise.allSettled([
        fetchSignal(ticker),
        fetchTopPicks(12),
      ]).then(results => {
        if (cancelled) return;

        const [selectedResult, topPicksResult] = results;
        const firstError = results.find(r => r.status === 'rejected');

        const selected = selectedResult.status === 'fulfilled' ? normalizeSignal(selectedResult.value) : prev.selected;
        const topPicks = topPicksResult.status === 'fulfilled' ? (topPicksResult.value || []).map(normalizeSignal) : prev.topPicks;

        if (process.env.NODE_ENV === 'development') {
          console.debug('[useSignals]', {
            ticker,
            selected,
            topPickCount: topPicks.length,
            topPicks: topPicks.map(signal => ({
              ticker: signal.ticker,
              verdict: signal.verdict,
              confidence: signal.confidence,
              net_sentiment: signal.net_sentiment,
              article_count: signal.article_count,
            })),
          });
        }

        setState({
          selected,
          topPicks,
          loading: false,
          error: firstError?.reason || null,
          updatedAt: new Date().toISOString(),
        });
      }).finally(() => {
        inFlight = false;
      });
    }

    loadSignals({ initial: true });
    const intervalId = setInterval(loadSignals, SIGNAL_POLL_MS);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [ticker]);

  const signals = useMemo(() => {
    const byTicker = new Map();
    state.topPicks.forEach(signal => byTicker.set(signal.ticker, signal));
    if (state.selected) byTicker.set(state.selected.ticker, state.selected);
    return Array.from(byTicker.values());
  }, [state.topPicks, state.selected]);

  return { ...state, signals };
}
