import React, { useEffect, useMemo, useState } from 'react';
import TerminalHeader from '../components/Terminal/TerminalHeader';
import HeroSignal from '../components/Terminal/HeroSignal';
import RecentSignalsPanel from '../components/Terminal/RecentSignalsPanel';
import ArticlesFeed from '../components/Terminal/ArticlesFeed';
import SECFilingsPanel from '../components/Terminal/SECFilingsPanel';
import TickerDrilldownPanel from '../components/Terminal/TickerDrilldownPanel';
import StatusBar from '../components/Terminal/StatusBar';
import { getHealth, SERVICE_URLS } from '../api/client';
import { useNews } from '../hooks/useNews';
import { useRecentSignals } from '../hooks/useRecentSignals';
import { useSignals } from '../hooks/useSignals';

const SERVICES = [
  { key: 'news',          name: 'news-ingestion-service',    port: '5001' },
  { key: 'preprocessing', name: 'preprocessing-service',     port: '5002' },
  { key: 'inference',     name: 'inference-engine',          port: '5003' },
  { key: 'signals',       name: 'signal-generation-service', port: '5004' },
  { key: 'results',       name: 'results-db-service',        port: '5005' },
];
const SERVICE_HEALTH_POLL_MS = 10000;

async function fetchInferenceHealthRaw() {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), 4000);
  try {
    const res = await fetch(`${SERVICE_URLS.inference}/health`, { signal: controller.signal });
    const data = await res.json().catch(() => ({}));
    if (data?.status === 'ok' || res.ok) return data;
    throw new Error(data?.detail || `HTTP ${res.status}`);
  } finally {
    clearTimeout(id);
  }
}

const LS_KEY = 'recentTickers';
const MAX_RECENT = 20;

const FRONTEND_DEFAULT_TICKERS = [
  'NVDA', 'AAPL', 'MSFT', 'META', 'TSLA', 'AMZN', 'AMD', 'GOOGL', 'NFLX', 'PLTR',
];

function loadRecentFromStorage() {
  try {
    const stored = localStorage.getItem(LS_KEY);
    const parsed = stored ? JSON.parse(stored) : null;
    if (Array.isArray(parsed) && parsed.length > 0) {
      const merged = [...new Set([...parsed, ...FRONTEND_DEFAULT_TICKERS])];
      return merged.slice(0, MAX_RECENT);
    }
  } catch {}
  return [...FRONTEND_DEFAULT_TICKERS];
}

export default function Dashboard() {
  const [ticker, setTicker] = useState(() => loadRecentFromStorage()[0]);
  const [recentTickers, setRecentTickers] = useState(loadRecentFromStorage);
  const [serviceState, setServiceState] = useState({ services: [], loading: true });

  const news = useNews(ticker);
  const signals = useSignals(ticker);
  const { signalsByTicker, ingestStatusByTicker, loading: recentLoading } = useRecentSignals(recentTickers);

  function handleTickerChange(newTicker) {
    const t = newTicker.toUpperCase();
    setTicker(t);
    setRecentTickers(prev => {
      const merged = [...new Set([t, ...prev, ...FRONTEND_DEFAULT_TICKERS])].slice(0, MAX_RECENT);
      try { localStorage.setItem(LS_KEY, JSON.stringify(merged)); } catch {}
      return merged;
    });
  }

  // Service health polling
  useEffect(() => {
    let cancelled = false;
    let inFlight = false;

    function poll() {
      if (inFlight) return;
      inFlight = true;

      Promise.allSettled(
        SERVICES.map(svc =>
          svc.key === 'inference'
            ? fetchInferenceHealthRaw()
            : getHealth(svc.key, { timeoutMs: 10000 }),
        ),
      ).then(results => {
        if (cancelled) return;
        const services = SERVICES.map((svc, i) => {
          const r = results[i];
          if (r.status === 'fulfilled') {
            const health = r.value;
            const detail = svc.key === 'inference' && health?.device
              ? `running · ${health.device}`
              : 'running';
            return { ...svc, status: detail, health };
          }
          return { ...svc, status: 'error', error: r.reason };
        });
        setServiceState({ services, loading: false });
      }).finally(() => { inFlight = false; });
    }

    poll();
    const id = setInterval(poll, SERVICE_HEALTH_POLL_MS);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  const selectedSignal = signals.selected;
  const updating = signals.loading && !!selectedSignal;

  // Enrich articles with sentiment from signal's supporting_articles
  const enrichedArticles = useMemo(() => {
    const supportMap = new Map();
    (selectedSignal?.supporting_articles || []).forEach(art => {
      supportMap.set(art.article_id, art);
    });
    return news.articles.map(article => {
      const support = supportMap.get(article.id);
      return {
        ...article,
        positive: support?.positive ?? article.positive,
        negative: support?.negative ?? article.negative,
        neutral:  support?.neutral  ?? article.neutral,
        net_sentiment: support
          ? support.positive - support.negative
          : article.net_sentiment ?? null,
      };
    });
  }, [news.articles, selectedSignal]);

  return (
    <div className="terminal-root">
      <TerminalHeader
        ticker={ticker}
        onTickerChange={handleTickerChange}
        isLive={!!selectedSignal && !signals.loading}
      />

      <main className="terminal-main">
        <HeroSignal
          signal={selectedSignal}
          ticker={ticker}
          loading={signals.loading}
          updating={updating}
        />

        <div className="sidebar-grid">
          <RecentSignalsPanel
            recentTickers={recentTickers}
            signalsByTicker={signalsByTicker}
            ingestStatusByTicker={ingestStatusByTicker}
            ticker={ticker}
            onTickerClick={handleTickerChange}
          />

          <div>
            <ArticlesFeed
              articles={enrichedArticles}
              signal={selectedSignal}
            />
            <SECFilingsPanel
              articles={enrichedArticles}
              ticker={ticker}
            />
            <TickerDrilldownPanel
              articles={enrichedArticles}
              signal={selectedSignal}
              ticker={ticker}
            />
          </div>
        </div>
      </main>

      <StatusBar services={serviceState.services} />
    </div>
  );
}
