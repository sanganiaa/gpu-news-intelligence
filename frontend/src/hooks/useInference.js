import { useEffect, useMemo, useRef, useState } from 'react';
import { inferBatchSentiment, fetchInferenceHealth } from '../api/inference';
import { preprocessArticles } from '../api/preprocessing';

const INFERENCE_METRICS_POLL_MS = 30000;

export function useInference(articles = []) {
  const articlesRef = useRef(articles);
  const [state, setState] = useState({
    health: null,
    sentiments: [],
    batch: null,
    loading: true,
    sentimentLoading: false,
    error: null,
    sentimentError: null,
    updatedAt: null,
    sentimentUpdatedAt: null,
  });

  useEffect(() => {
    let cancelled = false;
    let inFlight = false;

    function loadInferenceMetrics({ initial = false } = {}) {
      if (inFlight) return;
      inFlight = true;
      if (initial) setState(prev => ({ ...prev, loading: true, error: null }));

      fetchInferenceHealth()
        .then(health => {
          if (!cancelled) {
            setState(prev => ({
              ...prev,
              health,
              loading: false,
              error: null,
              updatedAt: new Date().toISOString(),
            }));
          }
        })
        .catch(error => {
          if (!cancelled) {
            setState(prev => ({
              ...prev,
              health: prev.health,
              loading: false,
              error,
              updatedAt: new Date().toISOString(),
            }));
          }
        })
        .finally(() => {
          inFlight = false;
        });
    }

    loadInferenceMetrics({ initial: true });
    const intervalId = setInterval(loadInferenceMetrics, INFERENCE_METRICS_POLL_MS);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, []);

  const articleSignature = useMemo(
    () => articles.slice(0, 20).map(article => `${article.ticker}:${article.id}:${article.ingested_at || article.published_at}`).join('|'),
    [articles],
  );

  useEffect(() => {
    articlesRef.current = articles;
  }, [articles]);

  useEffect(() => {
    let cancelled = false;
    const currentArticles = articlesRef.current;

    if (!currentArticles.length) {
      setState(prev => ({ ...prev, sentiments: [], batch: null, sentimentLoading: false, sentimentError: null }));
      return () => {
        cancelled = true;
      };
    }

    setState(prev => ({ ...prev, sentimentLoading: true, sentimentError: null }));

    preprocessArticles(currentArticles.slice(0, 20))
      .then(processed => inferBatchSentiment(processed.map(article => ({
        id: article.id,
        ticker: article.ticker,
        title: article.title,
        text: article.clean_text,
      }))))
      .then(batch => {
        if (!cancelled) {
          setState(prev => ({
            ...prev,
            sentiments: batch.results || [],
            batch,
            sentimentLoading: false,
            sentimentError: null,
            sentimentUpdatedAt: new Date().toISOString(),
          }));
        }
      })
      .catch(error => {
        if (!cancelled) {
          setState(prev => ({
            ...prev,
            sentiments: [],
            batch: null,
            sentimentLoading: false,
            sentimentError: error,
          }));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [articleSignature]);

  return state;
}
