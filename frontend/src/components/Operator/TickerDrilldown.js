import React, { useMemo } from 'react';

const verdictStyle = {
  BUY: { bg: 'var(--green-bg)', color: 'var(--green-text)' },
  HOLD: { bg: 'var(--amber-bg)', color: 'var(--amber-text)' },
  SELL: { bg: 'var(--red-bg)', color: 'var(--red-text)' },
};

function pct(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.round(Math.max(0, Math.min(n, 1)) * 100);
}

function formatTime(value) {
  if (!value) return 'time n/a';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'time n/a';
  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function dayKey(date) {
  return date.toISOString().slice(0, 10);
}

function sentimentScore(article) {
  const positive = Number(article.positive);
  const negative = Number(article.negative);
  if (Number.isFinite(positive) || Number.isFinite(negative)) {
    return (positive || 0) - (negative || 0);
  }
  if (article.sentiment === 'positive') return 1;
  if (article.sentiment === 'negative') return -1;
  return 0;
}

function sentimentLabel(article) {
  const score = sentimentScore(article);
  if (score > 0.05) return 'positive';
  if (score < -0.05) return 'negative';
  return 'neutral';
}

function articleWeight(article, direction) {
  const score = sentimentScore(article);
  return direction === 'positive' ? score : -score;
}

function useSentimentTrend(articles) {
  return useMemo(() => {
    const today = new Date();
    const days = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(today);
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - (6 - index));
      return { key: dayKey(date), label: date.toLocaleDateString([], { weekday: 'short' }), total: 0, count: 0 };
    });
    const byDay = new Map(days.map(day => [day.key, day]));

    articles.forEach(article => {
      const date = new Date(article.published_at || article.ingested_at);
      if (Number.isNaN(date.getTime())) return;
      const bucket = byDay.get(dayKey(date));
      if (!bucket) return;
      bucket.total += sentimentScore(article);
      bucket.count += 1;
    });

    return days.map(day => ({
      ...day,
      value: day.count ? day.total / day.count : 0,
    }));
  }, [articles]);
}

function CaseList({ title, articles, empty }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.04em', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 8 }}>
        {title}
      </div>
      {articles.length ? articles.map(article => (
        <div key={article.id} style={{ padding: '8px 0', borderTop: '0.5px solid var(--border)' }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
            <span style={{ fontSize: 10, color: 'var(--text-hint)', fontFamily: 'var(--font-mono)' }}>{formatTime(article.published_at || article.ingested_at)}</span>
            <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{article.source || 'source'}</span>
          </div>
          <div style={{ fontSize: 12, lineHeight: 1.4, color: 'var(--text-primary)', fontWeight: 500 }}>{article.title}</div>
          <div style={{ fontSize: 11, lineHeight: 1.45, color: 'var(--text-secondary)', marginTop: 4 }}>
            {article.investment_implication || article.summary_ai || article.summary || 'No driver explanation available.'}
          </div>
        </div>
      )) : (
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', padding: '8px 0', borderTop: '0.5px solid var(--border)' }}>{empty}</div>
      )}
    </div>
  );
}

function TrendBars({ trend }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6, alignItems: 'end', minHeight: 86 }}>
      {trend.map(day => {
        const height = Math.max(8, Math.round(Math.abs(day.value) * 62));
        const color = day.value > 0.05 ? 'var(--green)' : day.value < -0.05 ? 'var(--red)' : '#9C9890';
        return (
          <div key={day.key} style={{ minWidth: 0, textAlign: 'center' }}>
            <div style={{ height: 64, display: 'flex', alignItems: day.value < 0 ? 'flex-start' : 'flex-end', justifyContent: 'center', borderBottom: '0.5px solid var(--border)' }}>
              <div style={{ width: '70%', height, background: color, borderRadius: 4 }} title={`${day.label}: ${Math.round(day.value * 100)} net`} />
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-hint)', marginTop: 5 }}>{day.label}</div>
          </div>
        );
      })}
    </div>
  );
}

export default function TickerDrilldown({ ticker, articles = [], signal, onClose }) {
  const tickerArticles = useMemo(
    () => articles
      .filter(article => article.ticker === ticker)
      .sort((a, b) => new Date(b.published_at || b.ingested_at) - new Date(a.published_at || a.ingested_at)),
    [articles, ticker],
  );
  const trend = useSentimentTrend(tickerArticles);
  const positiveArticles = useMemo(
    () => tickerArticles
      .filter(article => sentimentLabel(article) === 'positive')
      .sort((a, b) => articleWeight(b, 'positive') - articleWeight(a, 'positive'))
      .slice(0, 3),
    [tickerArticles],
  );
  const negativeArticles = useMemo(
    () => tickerArticles
      .filter(article => sentimentLabel(article) === 'negative')
      .sort((a, b) => articleWeight(b, 'negative') - articleWeight(a, 'negative'))
      .slice(0, 3),
    [tickerArticles],
  );
  const vs = verdictStyle[signal?.verdict] || verdictStyle.HOLD;
  const drivers = signal?.supporting_articles || [];

  return (
    <div className="card" style={{ marginBottom: 12 }}>
      <div className="card-title">
        Ticker drilldown · <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>{ticker}</span>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            style={{ border: '0.5px solid var(--border-strong)', background: 'var(--surface-2)', color: 'var(--text-secondary)', borderRadius: 4, padding: '2px 7px', fontSize: 10, cursor: 'pointer' }}
          >
            Close
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 10, fontWeight: 600, background: vs.bg, color: vs.color, padding: '3px 8px', borderRadius: 4 }}>{signal?.verdict || 'HOLD'}</span>
            <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{signal ? `${pct(signal.confidence)}% confidence from ${signal.article_count} articles` : 'No current generated signal'}</span>
          </div>
          <div style={{ fontSize: 12, lineHeight: 1.5, color: 'var(--text-secondary)' }}>
            {signal
              ? `${signal.verdict} is driven by weighted article sentiment of ${Math.round(Number(signal.net_sentiment || 0) * 100)} net points.`
              : 'Signal explanation will appear after the signal service generates a ticker result.'}
          </div>
          <div style={{ marginTop: 10 }}>
            {drivers.slice(0, 4).map(driver => (
              <div key={driver.article_id || driver.title} style={{ fontSize: 11, color: 'var(--text-secondary)', padding: '4px 0', borderTop: '0.5px solid var(--border)' }}>
                <span style={{ color: 'var(--text-primary)' }}>{driver.title}</span>
                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-hint)' }}> · pos {pct(driver.positive)}% neg {pct(driver.negative)}%</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.04em', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 8 }}>
            Sentiment trend · last 7 days
          </div>
          <TrendBars trend={trend} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 12 }}>
        <CaseList title="Bull case" articles={positiveArticles} empty="No positive articles in the current set." />
        <CaseList title="Bear case" articles={negativeArticles} empty="No negative articles in the current set." />
      </div>

      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.04em', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 8 }}>
        Articles · {tickerArticles.length}
      </div>
      {tickerArticles.length ? tickerArticles.map(article => (
        <div key={article.id} style={{ display: 'grid', gridTemplateColumns: '92px 1fr 124px', gap: 10, padding: '7px 0', borderTop: '0.5px solid var(--border)', alignItems: 'start' }}>
          <span style={{ fontSize: 10, color: 'var(--text-hint)', fontFamily: 'var(--font-mono)' }}>{formatTime(article.published_at || article.ingested_at)}</span>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12, color: 'var(--text-primary)', fontWeight: 500, lineHeight: 1.35 }}>{article.title}</div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.45, marginTop: 3 }}>{article.summary_ai || article.summary || 'AI summary pending.'}</div>
          </div>
          <span style={{ fontSize: 10, color: 'var(--text-secondary)', textAlign: 'right' }}>{article.source || 'source'}</span>
        </div>
      )) : (
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', padding: '8px 0', borderTop: '0.5px solid var(--border)' }}>
          No articles available for this ticker.
        </div>
      )}
    </div>
  );
}
