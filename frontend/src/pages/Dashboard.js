import React, { useCallback, useEffect, useMemo, useState } from 'react';
import TopBar from '../components/Operator/TopBar';
import KPIRow from '../components/Operator/KPIRow';
import ServiceHealth from '../components/Operator/ServiceHealth';
import PipelineMetrics from '../components/Operator/PipelineMetrics';
import IngestionFeed from '../components/Operator/IngestionFeed';
import FilingsFeed from '../components/Operator/FilingsFeed';
import ActiveSignals from '../components/Operator/ActiveSignals';
import TickerDrilldown from '../components/Operator/TickerDrilldown';
import SystemLog from '../components/Operator/SystemLog';
import SearchBar from '../components/Dashboard/SearchBar';
import MarketOverview from '../components/MarketOverview';
import { getHealth } from '../api/client';
import { fetchMetrics, fetchSignalAccuracy, fetchTickerHistory } from '../api/results';
import { useInference } from '../hooks/useInference';
import { useNews } from '../hooks/useNews';
import { useSignals } from '../hooks/useSignals';

const SERVICES = [
  { key: 'news', name: 'news-ingestion-service', port: '5001' },
  { key: 'preprocessing', name: 'preprocessing-service', port: '5002' },
  { key: 'inference', name: 'inference-engine', port: '5003' },
  { key: 'signals', name: 'signal-generation-service', port: '5004' },
  { key: 'results', name: 'results-db-service', port: '5005' },
];

const SERVICE_HEALTH_POLL_MS = 10000;
const RESULTS_POLL_MS = 30000;

function pct(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return 'n/a';
  return `${Math.round(Number(value) * 100)}%`;
}

function countBy(list, key) {
  return list.reduce((acc, item) => {
    const value = item[key] || 'UNKNOWN';
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString();
}

function newestTimestamp(...values) {
  const timestamps = values
    .filter(Boolean)
    .map(value => new Date(value).getTime())
    .filter(value => Number.isFinite(value));
  if (!timestamps.length) return null;
  return new Date(Math.max(...timestamps)).toISOString();
}

export default function Dashboard() {
  const [ticker, setTicker] = useState('NVDA');
  const [activeTab, setActiveTab] = useState('operator');
  const [drilldownTicker, setDrilldownTicker] = useState(null);
  const news = useNews(ticker);
  const signals = useSignals(ticker);
  const inference = useInference(news.articles);
  const [serviceState, setServiceState] = useState({ services: [], loading: true });
  const [resultsState, setResultsState] = useState({
    history: null,
    accuracy: null,
    metrics: [],
    loading: true,
    error: null,
    updatedAt: null,
  });

  useEffect(() => {
    let cancelled = false;
    let inFlight = false;

    function loadServiceHealth({ initial = false } = {}) {
      if (inFlight) return;
      inFlight = true;
      if (initial) setServiceState(prev => ({ ...prev, loading: true }));

      Promise.allSettled(SERVICES.map(service => getHealth(service.key))).then(results => {
        if (cancelled) return;
        const services = SERVICES.map((service, index) => {
          const result = results[index];
          if (result.status === 'fulfilled') {
            const health = result.value;
            const detail = service.key === 'inference' && health.device ? `running · ${health.device}` : 'running';
            return { ...service, status: detail, health };
          }
          return { ...service, status: 'error', error: result.reason };
        });
        setServiceState({ services, loading: false, updatedAt: new Date().toISOString() });
      }).finally(() => {
        inFlight = false;
      });
    }

    loadServiceHealth({ initial: true });
    const intervalId = setInterval(loadServiceHealth, SERVICE_HEALTH_POLL_MS);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    let inFlight = false;

    function loadResults({ initial = false } = {}) {
      if (inFlight) return;
      inFlight = true;
      if (initial) setResultsState(prev => ({ ...prev, loading: true, error: null }));

      Promise.allSettled([
        fetchTickerHistory(ticker, { limit: 50 }),
        fetchSignalAccuracy({ ticker }),
        fetchMetrics({ ticker, limit: 25 }),
      ]).then(results => {
        if (cancelled) return;

        const [historyResult, accuracyResult, metricsResult] = results;
        const firstError = results.find(r => r.status === 'rejected');

        setResultsState(prev => ({
          history: historyResult.status === 'fulfilled' ? historyResult.value : prev.history,
          accuracy: accuracyResult.status === 'fulfilled' ? accuracyResult.value : prev.accuracy,
          metrics: metricsResult.status === 'fulfilled' ? metricsResult.value : prev.metrics,
          loading: false,
          error: firstError?.reason || null,
          updatedAt: new Date().toISOString(),
        }));
      }).finally(() => {
        inFlight = false;
      });
    }

    loadResults({ initial: true });
    const intervalId = setInterval(loadResults, RESULTS_POLL_MS);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [ticker]);

  const selectedSignal = signals.selected;
  const openTickerDrilldown = useCallback(clickedTicker => {
    if (!clickedTicker) return;
    setTicker(clickedTicker);
    setDrilldownTicker(clickedTicker);
  }, []);

  const supportingById = useMemo(() => {
    const map = new Map();
    (selectedSignal?.supporting_articles || []).forEach(article => {
      map.set(article.article_id, {
        sentiment: article.positive >= article.negative && article.positive >= article.neutral ? 'positive' : article.negative >= article.neutral ? 'negative' : 'neutral',
        confidence: Math.max(article.positive, article.negative, article.neutral),
        positive: article.positive,
        negative: article.negative,
        neutral: article.neutral,
      });
    });
    inference.sentiments.forEach(result => {
      map.set(result.id, {
        sentiment: result.sentiment,
        confidence: result.confidence,
        positive: result.probabilities?.positive,
        negative: result.probabilities?.negative,
        neutral: result.probabilities?.neutral,
        latency_ms: result.latency_ms,
      });
    });
    return map;
  }, [selectedSignal, inference.sentiments]);

  const enrichedArticles = useMemo(() => {
    const raw = news.articles.length ? news.articles : (resultsState.history?.articles || []);
    return raw.map(article => {
      const support = supportingById.get(article.id);
      return {
        ...article,
        sentiment: support?.sentiment,
        sentiment_confidence: support?.confidence,
        positive: support?.positive ?? article.positive,
        negative: support?.negative ?? article.negative,
        neutral: support?.neutral ?? article.neutral,
        latency_ms: support?.latency_ms ?? article.latency_ms,
      };
    });
  }, [news.articles, resultsState.history, supportingById]);

  const displayedArticles = useMemo(() => enrichedArticles.slice(0, 12), [enrichedArticles]);
  const drilldownSignal = useMemo(
    () => signals.signals.find(signal => signal.ticker === drilldownTicker) || (selectedSignal?.ticker === drilldownTicker ? selectedSignal : null),
    [drilldownTicker, selectedSignal, signals.signals],
  );

  const signalDistribution = useMemo(() => countBy(signals.signals, 'verdict'), [signals.signals]);
  const averageConfidence = useMemo(() => {
    if (!signals.signals.length) return null;
    const total = signals.signals.reduce((sum, signal) => sum + Number(signal.confidence || 0), 0);
    return total / signals.signals.length;
  }, [signals.signals]);

  const articleTotal = Object.values(news.tickers || {}).reduce((sum, n) => sum + Number(n || 0), 0);
  const healthyCount = serviceState.services.filter(s => s.status.startsWith('running')).length;
  const inferenceHealth = inference.health;
  const lastUpdatedAt = newestTimestamp(
    serviceState.updatedAt,
    news.updatedAt,
    signals.updatedAt,
    inference.updatedAt,
    inference.sentimentUpdatedAt,
    resultsState.updatedAt,
  );

  const kpis = {
    articleCount: {
      value: news.loading ? '...' : formatNumber(articleTotal || displayedArticles.length),
      sub: `${Object.keys(news.tickers || {}).length} tickers tracked`,
    },
    signalCount: {
      value: signals.loading ? '...' : formatNumber(resultsState.accuracy?.total_signals || signals.signals.length),
      sub: `BUY ${signalDistribution.BUY || 0} · HOLD ${signalDistribution.HOLD || 0} · SELL ${signalDistribution.SELL || 0}`,
      accuracy: resultsState.loading ? '...' : pct(resultsState.accuracy?.accuracy),
      accuracySub: `${resultsState.accuracy?.signals_with_outcome || 0} outcomes recorded`,
    },
    inference: {
      value: inferenceHealth?.model_loaded ? 'ready' : inference.loading ? '...' : 'n/a',
      sub: inference.batch?.throughput_articles_per_sec
        ? `${inference.batch.throughput_articles_per_sec}/sec · ${inference.batch.device}`
        : inferenceHealth?.device ? `${inferenceHealth.device} · FinBERT` : 'model health endpoint',
    },
  };

  const pipelineMetrics = useMemo(() => {
    const rows = [];
    if (inferenceHealth?.model_load_time_ms !== undefined) {
      const ms = Number(inferenceHealth.model_load_time_ms || 0);
      rows.push({
        label: 'Model load time',
        value: Math.min(ms / 100, 100),
        display: `${Math.round(ms)}ms`,
        color: 'var(--blue)',
      });
    }
    if (inference.batch?.total_latency_ms !== undefined) {
      const avgMs = Number(inference.batch.total_latency_ms || 0) / Math.max(Number(inference.batch.total_articles || 1), 1);
      rows.push({
        label: 'Inference latency avg',
        value: Math.min(avgMs, 100),
        display: `${Math.round(avgMs)}ms`,
        color: 'var(--blue)',
      });
    }
    if (averageConfidence !== null) {
      rows.push({
        label: 'Signal confidence avg',
        value: Math.round(averageConfidence * 100),
        display: pct(averageConfidence),
        color: 'var(--green)',
      });
    }
    resultsState.metrics.slice(0, 3).forEach(metric => {
      rows.push({
        label: metric.metric_name,
        value: Math.max(0, Math.min(Number(metric.value || 0) * 100, 100)),
        display: `${metric.value}`,
        color: 'var(--green)',
      });
    });
    if (news.sourceStatus) {
      const total = Object.values(news.sourceStatus).reduce((sum, n) => sum + Number(n || 0), 0);
      const active = Object.values(news.sourceStatus).filter(n => Number(n) > 0).length;
      const sourceCount = Object.keys(news.sourceStatus).length || 1;
      rows.push({
        label: 'Source diversity',
        value: active ? Math.round((active / sourceCount) * 100) : 0,
        display: total ? `${active}/${sourceCount} sources` : 'no articles',
        color: 'var(--amber)',
      });
    }
    return rows;
  }, [averageConfidence, inference.batch, inferenceHealth, news.sourceStatus, resultsState.metrics]);

  const systemLogs = useMemo(() => {
    const now = new Date().toISOString();
    const logs = serviceState.services.map(service => ({
      id: `svc-${service.key}`,
      cls: service.status.startsWith('running') ? 'ok' : 'err',
      svc: `[${service.key}]`,
      msg: service.status.startsWith('running') ? `${service.name} health check ok` : service.error?.message || 'health check failed',
      ts: now,
    }));
    if (selectedSignal) {
      logs.unshift({
        id: `signal-${selectedSignal.ticker}`,
        cls: 'info',
        svc: '[signals]',
        msg: `${selectedSignal.ticker} ${selectedSignal.verdict} confidence ${pct(selectedSignal.confidence)} from ${selectedSignal.article_count} articles`,
        ts: selectedSignal.generated_at,
      });
    }
    if (inference.sentimentError) {
      logs.unshift({ id: 'inference-error', cls: 'err', svc: '[inference]', msg: inference.sentimentError.message, ts: now });
    }
    if (resultsState.error) {
      logs.unshift({ id: 'results-error', cls: 'err', svc: '[results]', msg: resultsState.error.message, ts: now });
    }
    return logs.slice(0, 12);
  }, [inference.sentimentError, selectedSignal, serviceState.services, resultsState.error]);

  return (
    <div className="app">
      <TopBar healthyCount={healthyCount} serviceCount={SERVICES.length} lastUpdatedAt={lastUpdatedAt} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <SearchBar value={ticker} onChange={setTicker} />
        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
          Showing backend data for <strong>{ticker}</strong>
          {(news.error || signals.error || resultsState.error) && ' · partial data'}
        </span>
      </div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 12, borderBottom: '0.5px solid var(--border-strong)' }}>
        {[
          { key: 'operator', label: 'Operator' },
          { key: 'market', label: 'Market overview' },
        ].map(tab => {
          const selected = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              style={{
                border: 0,
                borderBottom: selected ? '2px solid var(--text-primary)' : '2px solid transparent',
                background: 'transparent',
                color: selected ? 'var(--text-primary)' : 'var(--text-secondary)',
                padding: '8px 10px',
                fontSize: 12,
                fontWeight: selected ? 700 : 500,
                cursor: 'pointer',
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      {activeTab === 'operator' ? (
        <>
          <KPIRow articleCount={kpis.articleCount} signalCount={kpis.signalCount} gpuUtil={kpis.inference} />
          <div className="grid2">
            <ServiceHealth services={serviceState.services} loading={serviceState.loading} />
            <PipelineMetrics metrics={pipelineMetrics} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
            <IngestionFeed
              articles={enrichedArticles}
              ticker={ticker}
              loading={news.loading || resultsState.loading}
              error={news.error}
              onTickerClick={openTickerDrilldown}
            />
            <ActiveSignals ticker={ticker} signals={signals.signals} loading={signals.loading} error={signals.error} onTickerClick={openTickerDrilldown} />
          </div>
          <FilingsFeed articles={[...(news.latest || []), ...enrichedArticles]} loading={news.loading || resultsState.loading} error={news.error} />
          {drilldownTicker && (
            <TickerDrilldown
              ticker={drilldownTicker}
              articles={enrichedArticles}
              signal={drilldownSignal}
              onClose={() => setDrilldownTicker(null)}
            />
          )}
          <SystemLog logs={systemLogs} />
        </>
      ) : (
        <MarketOverview
          latestArticles={news.latest}
          tickerArticles={news.articles}
          tickers={news.tickers}
          signals={signals.signals}
          loading={news.loading || signals.loading}
          error={news.error}
        />
      )}
    </div>
  );
}
