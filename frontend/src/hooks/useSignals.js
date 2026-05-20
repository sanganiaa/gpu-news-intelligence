import { useEffect, useMemo, useState } from 'react';
import { fetchSignal, fetchTopPicks } from '../api/signals';

const SIGNAL_POLL_MS = 30000;

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

        setState(prev => ({
          selected: selectedResult.status === 'fulfilled' ? selectedResult.value : prev.selected,
          topPicks: topPicksResult.status === 'fulfilled' ? topPicksResult.value : prev.topPicks,
          loading: false,
          error: firstError?.reason || null,
          updatedAt: new Date().toISOString(),
        }));
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
