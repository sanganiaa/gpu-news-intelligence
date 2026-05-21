import { useEffect, useState } from 'react';
import { fetchArticles, fetchArticlesByTicker, fetchLatestArticles, fetchNewsTickers, fetchSourceStatus } from '../api/news';

const NEWS_POLL_MS = 30000;

export function useNews(ticker, { limit = 20 } = {}) {
  const [state, setState] = useState({
    articles: [],
    latest: [],
    tickers: {},
    sourceStatus: {},
    loading: true,
    error: null,
    updatedAt: null,
  });

  useEffect(() => {
    let cancelled = false;
    let inFlight = false;

    function loadNews({ initial = false } = {}) {
      if (inFlight) return;
      inFlight = true;
      if (initial) setState(prev => ({ ...prev, loading: true, error: null }));

      const selectedArticles = fetchArticles({ ticker, limit, contentType: 'news' })
        .catch(() => fetchArticlesByTicker(ticker, { limit, contentType: 'news' }));

      Promise.allSettled([
        selectedArticles,
        fetchLatestArticles(50),
        fetchNewsTickers(),
        fetchSourceStatus(),
      ]).then(results => {
        if (cancelled) return;

        const [articlesResult, latestResult, tickersResult, sourceResult] = results;
        const firstError = results.find(r => r.status === 'rejected');

        setState(prev => ({
          articles: articlesResult.status === 'fulfilled' ? articlesResult.value : prev.articles,
          latest: latestResult.status === 'fulfilled' ? latestResult.value : prev.latest,
          tickers: tickersResult.status === 'fulfilled' ? tickersResult.value : prev.tickers,
          sourceStatus: sourceResult.status === 'fulfilled' ? sourceResult.value : prev.sourceStatus,
          loading: false,
          error: firstError?.reason || null,
          updatedAt: new Date().toISOString(),
        }));
      }).finally(() => {
        inFlight = false;
      });
    }

    loadNews({ initial: true });
    const intervalId = setInterval(loadNews, NEWS_POLL_MS);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [ticker, limit]);

  return state;
}
