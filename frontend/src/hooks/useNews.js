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

      const selectedArticles = fetchArticles({ ticker, limit })
        .catch(() => fetchArticlesByTicker(ticker, { limit }));

      Promise.allSettled([
        selectedArticles,
        fetchLatestArticles(50),
        fetchNewsTickers(),
        fetchSourceStatus(),
      ]).then(results => {
        if (cancelled) return;

        const [articlesResult, latestResult, tickersResult, sourceResult] = results;
        const firstError = results.find(r => r.status === 'rejected');

        setState(prev => {
          const articles = articlesResult.status === 'fulfilled' ? articlesResult.value : prev.articles;
          const latest = latestResult.status === 'fulfilled' ? latestResult.value : prev.latest;
          const tickers = tickersResult.status === 'fulfilled' ? tickersResult.value : prev.tickers;
          const sourceStatus = sourceResult.status === 'fulfilled' ? sourceResult.value : prev.sourceStatus;

          if (process.env.NODE_ENV === 'development') {
            console.debug('[useNews]', {
              ticker,
              selectedCount: articles.length,
              latestCount: latest.length,
              tickers,
              sourceStatus,
              selectedContentTypes: articles.reduce((acc, article) => {
                const key = article.content_type || 'unknown';
                acc[key] = (acc[key] || 0) + 1;
                return acc;
              }, {}),
            });
          }

          return {
            articles,
            latest,
            tickers,
            sourceStatus,
            loading: false,
            error: firstError?.reason || null,
            updatedAt: new Date().toISOString(),
          };
        });
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
