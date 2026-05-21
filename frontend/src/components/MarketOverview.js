import React, { useEffect, useMemo, useState } from 'react';
import { preprocessArticles } from '../api/preprocessing';

const WATCHLIST_SECTORS = {
  NVDA: 'AI Semis',
  AMD: 'AI Semis',
  INTC: 'AI Semis',
  QCOM: 'AI Semis',
  ARM: 'AI Semis',
  AVGO: 'AI Semis',
  TSM: 'Foundry & Equipment',
  ASML: 'Foundry & Equipment',
  SMCI: 'AI Infrastructure',
  SNOW: 'Cloud Data',
  PLTR: 'Cloud Data',
  ORCL: 'Cloud Data',
  CRM: 'Cloud Data',
  ADBE: 'Cloud Data',
  NOW: 'Cloud Data',
  MSFT: 'Mega-cap Platforms',
  AAPL: 'Mega-cap Platforms',
  AMZN: 'Mega-cap Platforms',
  META: 'Mega-cap Platforms',
  TSLA: 'High Beta Tech',
  NBIS: 'High Beta Tech',
};

const TAGS = new Set(['regulation', 'macro']);

function uniqueArticles(articles) {
  const byId = new Map();
  articles.forEach(article => {
    if (article?.id && !byId.has(article.id)) byId.set(article.id, article);
  });
  return Array.from(byId.values());
}

function formatDate(value) {
  if (!value) return 'n/a';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'n/a';
  return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

function parseFredTitle(title = '') {
  const match = title.match(/^([^:]+):\s*([^\s]+)\s+(.+?)\s+\(([^)]+)\)$/);
  if (!match) return { label: title, value: '', units: '', date: '' };
  return { label: match[1], value: match[2], units: match[3], date: match[4] };
}

function sentimentColor(value) {
  const score = Math.max(-1, Math.min(1, Number(value) || 0));
  if (score > 0.15) return { bg: 'var(--green-bg)', color: 'var(--green-text)', border: 'rgba(59,109,17,0.25)' };
  if (score < -0.15) return { bg: 'var(--red-bg)', color: 'var(--red-text)', border: 'rgba(163,45,45,0.25)' };
  return { bg: 'var(--surface-2)', color: 'var(--text-secondary)', border: 'var(--border)' };
}

function signalScore(signal) {
  const score = Number(signal?.net_sentiment ?? signal?.sentiment_score);
  if (Number.isFinite(score)) return score;

  const verdict = String(signal?.verdict || signal?.signal || '').toUpperCase();
  const confidence = Math.max(0, Math.min(Number(signal?.confidence || 0), 1));
  if (verdict === 'BUY') return confidence || 0.25;
  if (verdict === 'SELL') return -(confidence || 0.25);
  if (verdict === 'HOLD') return 0;
  return null;
}

function fearLabel(score) {
  if (score >= 70) return 'Elevated';
  if (score >= 45) return 'Watch';
  return 'Calm';
}

function sourceCounts(sourceStatus = {}) {
  return sourceStatus.sources || sourceStatus;
}

export default function MarketOverview({ latestArticles = [], tickerArticles = [], tickers = {}, signals = [], sourceStatus = {}, loading, error }) {
  const rawArticles = useMemo(
    () => uniqueArticles([...(latestArticles || []), ...(tickerArticles || [])]),
    [latestArticles, tickerArticles],
  );
  const [processedArticles, setProcessedArticles] = useState([]);
  const [preprocessState, setPreprocessState] = useState({ loading: false, error: null });

  useEffect(() => {
    let cancelled = false;
    const candidates = rawArticles
      .filter(article => article.source !== 'fred')
      .slice(0, 60);

    if (!candidates.length) {
      setProcessedArticles([]);
      setPreprocessState({ loading: false, error: null });
      return undefined;
    }

    setPreprocessState({ loading: true, error: null });
    preprocessArticles(candidates)
      .then(results => {
        if (cancelled) return;
        setProcessedArticles(results || []);
        setPreprocessState({ loading: false, error: null });
      })
      .catch(err => {
        if (cancelled) return;
        setProcessedArticles([]);
        setPreprocessState({ loading: false, error: err });
      });

    return () => {
      cancelled = true;
    };
  }, [rawArticles]);

  const macroIndicators = useMemo(() => {
    return rawArticles
      .filter(article => article.source === 'fred' || article.ticker === 'MACRO')
      .slice(0, 6)
      .map(article => ({ ...article, fred: parseFredTitle(article.title) }));
  }, [rawArticles]);

  const taggedById = useMemo(() => {
    const map = new Map();
    rawArticles.forEach(article => {
      if (article.catalyst_tag) map.set(article.id, { ...article, catalyst_tag: article.catalyst_tag });
    });
    processedArticles.forEach(article => {
      map.set(article.id, article);
    });
    return map;
  }, [processedArticles, rawArticles]);

  const riskArticles = useMemo(() => {
    return rawArticles
      .map(article => ({ ...article, ...(taggedById.get(article.id) || {}) }))
      .filter(article => TAGS.has(article.catalyst_tag))
      .slice(0, 8);
  }, [rawArticles, taggedById]);

  const sectors = useMemo(() => {
    const signalByTicker = new Map(signals.map(signal => [signal.ticker, signal]));
    const availableTickers = new Set([
      ...Object.keys(WATCHLIST_SECTORS),
      ...Object.keys(tickers || {}),
      ...signals.map(signal => signal.ticker),
    ]);
    const groups = new Map();

    Array.from(availableTickers).forEach(ticker => {
      const sector = WATCHLIST_SECTORS[ticker] || 'Other';
      const signal = signalByTicker.get(ticker);
      if (!signal && !(ticker in WATCHLIST_SECTORS)) return;
      if (!groups.has(sector)) groups.set(sector, { sector, tickers: [], total: 0, scored: 0 });
      const group = groups.get(sector);
      const score = signalScore(signal);
      group.tickers.push({
        ticker,
        score,
        verdict: signal?.verdict || signal?.signal,
        confidence: signal?.confidence,
      });
      if (Number.isFinite(score)) {
        group.total += score;
        group.scored += 1;
      }
    });

    return Array.from(groups.values())
      .map(group => ({
        ...group,
        average: group.scored ? group.total / group.scored : 0,
      }))
      .sort((a, b) => b.scored - a.scored || a.sector.localeCompare(b.sector));
  }, [signals, tickers]);

  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;
    console.debug('[MarketOverview]', {
      rawArticleCount: rawArticles.length,
      macroCount: macroIndicators.length,
      riskCount: riskArticles.length,
      signals: signals.map(signal => ({
        ticker: signal.ticker,
        verdict: signal.verdict || signal.signal,
        net_sentiment: signal.net_sentiment ?? signal.sentiment_score,
        confidence: signal.confidence,
      })),
      sectors: sectors.map(group => ({
        sector: group.sector,
        scored: group.scored,
        total: group.tickers.length,
      })),
      sourceStatus,
    });
  }, [macroIndicators.length, rawArticles.length, riskArticles.length, sectors, signals, sourceStatus]);

  const fear = useMemo(() => {
    const negatives = signals.flatMap(signal => (
      signal.supporting_articles || []
    ).map(article => Number(article.negative)).filter(value => Number.isFinite(value)));

    if (negatives.length) {
      const avg = negatives.reduce((sum, value) => sum + value, 0) / negatives.length;
      return { score: Math.round(avg * 100), sample: negatives.length };
    }

    const netDrawdowns = signals
      .map(signal => Math.max(0, -Number(signal.net_sentiment || 0)))
      .filter(value => Number.isFinite(value));
    const avg = netDrawdowns.length ? netDrawdowns.reduce((sum, value) => sum + value, 0) / netDrawdowns.length : 0;
    return { score: Math.round(avg * 100), sample: netDrawdowns.length };
  }, [signals]);

  return (
    <div>
      {(error || preprocessState.error) && (
        <div className="card" style={{ marginBottom: 12, fontSize: 11, color: 'var(--red-text)' }}>
          {error ? `News service unavailable: ${error.message}` : `Preprocessing unavailable: ${preprocessState.error.message}`}
        </div>
      )}

      <div className="grid3">
        <div className="card">
          <div className="card-title">
            FRED macro indicators
            <span style={{ fontSize: 10 }}>{loading ? 'loading' : `${macroIndicators.length} series`}</span>
          </div>
          {macroIndicators.length === 0 ? (
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', padding: '8px 0' }}>
              {loading
                ? 'Waiting for macro observations from the news service.'
                : Number(sourceCounts(sourceStatus).fred || 0) === 0
                  ? 'No FRED observations yet. Set FRED_API_KEY and run an ingestion cycle to populate CPI, unemployment, and fed funds data.'
                  : 'No macro observations are present in the current source window.'}
            </div>
          ) : macroIndicators.map(article => (
            <div key={article.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, padding: '7px 0', borderBottom: '0.5px solid var(--border)' }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600 }}>{article.fred.label}</div>
                <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{article.fred.date || formatDate(article.published_at)}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="mono" style={{ fontSize: 13, fontWeight: 600 }}>{article.fred.value || 'n/a'}</div>
                <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{article.fred.units}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="card">
          <div className="card-title">
            Fear indicator
            <span style={{ fontSize: 10 }}>{fear.sample} inputs</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
            <span className="mono" style={{ fontSize: 40, fontWeight: 700, color: fear.score >= 45 ? 'var(--red-text)' : 'var(--green-text)' }}>
              {fear.score}
            </span>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{fearLabel(fear.score)}</span>
          </div>
          <div style={{ height: 8, borderRadius: 4, background: 'var(--surface-2)', overflow: 'hidden', margin: '8px 0 10px' }}>
            <div style={{ height: '100%', width: `${Math.min(fear.score, 100)}%`, background: fear.score >= 45 ? 'var(--red)' : 'var(--green)' }} />
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.45 }}>
            VIX-equivalent proxy from average negative sentiment across available ticker signals.
          </div>
        </div>

        <div className="card">
          <div className="card-title">
            Geopolitical risk feed
            <span style={{ fontSize: 10 }}>{preprocessState.loading ? 'tagging' : `${riskArticles.length} tagged`}</span>
          </div>
          {riskArticles.length === 0 ? (
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', padding: '8px 0' }}>
              {preprocessState.loading
                ? 'Scanning current source items for regulation and macro catalysts.'
                : 'No regulation or macro catalyst items found in the current source set.'}
            </div>
          ) : riskArticles.map(article => (
            <div key={article.id} style={{ padding: '7px 0', borderBottom: '0.5px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                <span className="mono" style={{ fontSize: 10, color: 'var(--text-primary)', width: 42 }}>{article.ticker}</span>
                <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 3, background: 'var(--amber-bg)', color: 'var(--amber-text)' }}>
                  {article.catalyst_tag}
                </span>
                <span style={{ fontSize: 10, color: 'var(--text-hint)' }}>{formatDate(article.published_at)}</span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {article.title}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="card-title">
          Sector heatmap
          <span style={{ fontSize: 10 }}>{sectors.length} sectors</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8 }}>
          {sectors.length === 0 ? (
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', padding: '8px 0' }}>
              No ticker signals available yet. Generate or refresh a signal to populate sector sentiment.
            </div>
          ) : sectors.map(group => {
            const colors = sentimentColor(group.average);
            return (
              <div key={group.sector} style={{ border: `1px solid ${colors.border}`, background: colors.bg, color: colors.color, borderRadius: 8, padding: 10, minHeight: 92 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 700 }}>{group.sector}</span>
                  <span className="mono" style={{ fontSize: 12 }}>{group.average >= 0 ? '+' : ''}{group.average.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {group.tickers.slice(0, 10).map(item => (
                    <span
                      key={item.ticker}
                      className="mono"
                      title={item.verdict ? `${item.ticker} ${item.verdict} ${Math.round(Number(item.confidence || 0) * 100)}%` : `${item.ticker} no signal`}
                      style={{
                        fontSize: 10,
                        padding: '2px 5px',
                        borderRadius: 4,
                        background: Number.isFinite(item.score) ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.35)',
                        opacity: Number.isFinite(item.score) ? 1 : 0.55,
                      }}
                    >
                      {item.ticker}
                    </span>
                  ))}
                </div>
                <div style={{ marginTop: 8, fontSize: 10, color: 'var(--text-secondary)' }}>
                  {group.scored}/{group.tickers.length} tickers with sentiment
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
