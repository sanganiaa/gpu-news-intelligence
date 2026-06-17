import React, { useState, useMemo } from 'react';

const VERDICT_COLOR = {
  BUY:  '#00ff41',
  SELL: '#ff3131',
  HOLD: '#ffaa00',
};

function pct(v) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(Math.max(0, Math.min(n, 1)) * 100) : 0;
}

function sentimentScore(article) {
  const pos = Number(article.positive);
  const neg = Number(article.negative);
  if (Number.isFinite(pos) || Number.isFinite(neg)) return (pos || 0) - (neg || 0);
  if (article.sentiment === 'positive') return 1;
  if (article.sentiment === 'negative') return -1;
  return 0;
}

function dayKey(date) { return date.toISOString().slice(0, 10); }

function stripHtml(value) {
  if (!value) return '';
  return String(value)
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractHref(value) {
  if (!value) return null;
  const match = String(value).match(/href=["']([^"']+)["']/i);
  return match ? match[1] : null;
}

function TrendBars({ articles }) {
  const trend = useMemo(() => {
    const today = new Date();
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - (6 - i));
      return { key: dayKey(d), label: d.toLocaleDateString([], { weekday: 'short' }), total: 0, count: 0 };
    });
    const byDay = new Map(days.map(d => [d.key, d]));
    articles.forEach(a => {
      const d = new Date(a.published_at || a.ingested_at);
      if (Number.isNaN(d.getTime())) return;
      const bucket = byDay.get(dayKey(d));
      if (!bucket) return;
      bucket.total += sentimentScore(a);
      bucket.count += 1;
    });
    return days.map(d => ({ ...d, value: d.count ? d.total / d.count : 0 }));
  }, [articles]);

  return (
    <div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-dim)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>
        Sentiment trend · 7 days
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, alignItems: 'end', height: 64 }}>
        {trend.map(day => {
          const h = Math.max(4, Math.round(Math.abs(day.value) * 50));
          const color = day.value > 0.05 ? '#00ff41' : day.value < -0.05 ? '#ff3131' : '#444';
          return (
            <div key={day.key} style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
              <div
                style={{ width: '60%', height: h, background: color, borderRadius: 2, marginBottom: 4 }}
                title={`${day.label}: ${Math.round(day.value * 100)} net`}
              />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--text-dim)' }}>{day.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ArticleLink({ article }) {
  const rawTitle = article.title || '';
  const href = extractHref(rawTitle) || article.url || null;
  const title = stripHtml(rawTitle) || 'Untitled';

  return href ? (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-primary)', textDecoration: 'none', lineHeight: 1.4, display: 'block' }}
    >
      &gt; {title}
    </a>
  ) : (
    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-primary)', lineHeight: 1.4, display: 'block' }}>
      &gt; {title}
    </span>
  );
}

export default function TickerDrilldownPanel({ articles = [], signal, ticker }) {
  const [open, setOpen] = useState(false);

  const tickerArticles = useMemo(() =>
    articles
      .filter(a => (a.ticker || '').toUpperCase() === ticker.toUpperCase())
      .sort((a, b) => new Date(b.published_at || b.ingested_at) - new Date(a.published_at || a.ingested_at)),
    [articles, ticker],
  );

  const bullArticles = useMemo(() =>
    tickerArticles
      .filter(a => sentimentScore(a) > 0.05)
      .sort((a, b) => sentimentScore(b) - sentimentScore(a))
      .slice(0, 3),
    [tickerArticles],
  );

  const bearArticles = useMemo(() =>
    tickerArticles
      .filter(a => sentimentScore(a) < -0.05)
      .sort((a, b) => sentimentScore(a) - sentimentScore(b))
      .slice(0, 3),
    [tickerArticles],
  );

  const verdict = signal?.verdict || 'HOLD';
  const verdictColor = VERDICT_COLOR[verdict] || '#ffaa00';
  const confidence = pct(signal?.confidence);
  const articleCount = signal?.article_count ?? tickerArticles.length;

  return (
    <div className="t-card" style={{ overflow: 'hidden', marginTop: 12 }}>
      <div
        onClick={() => setOpen(v => !v)}
        style={{ padding: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
      >
        <div className="t-card-title" style={{ margin: 0 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-secondary)', marginRight: 8 }}>
            {open ? '▼' : '▶'}
          </span>
          Ticker Drilldown · {ticker}
        </div>
        {signal && (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: verdictColor }}>
            {verdict} {confidence}%
          </span>
        )}
      </div>

      {open && (
        <>
          <hr className="t-divider" />

          {/* Signal summary */}
          <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
            {signal ? (
              <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600, color: verdictColor, letterSpacing: '0.08em' }}>
                  {verdict}
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-secondary)' }}>
                  {confidence}% confidence
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-dim)' }}>
                  {articleCount} article{articleCount !== 1 ? 's' : ''}
                </span>
              </div>
            ) : (
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-dim)' }}>
                No signal generated yet.
              </span>
            )}
          </div>

          {/* Sentiment trend */}
          <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
            <TrendBars articles={tickerArticles} />
          </div>

          {/* Bull / Bear case */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
            <div style={{ padding: '12px 14px', borderRight: '1px solid var(--border)' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: '#e0e0e0', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>
                Bull Case
              </div>
              {bullArticles.length === 0 ? (
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-dim)' }}>No positive articles.</span>
              ) : bullArticles.map((a, i) => (
                <div key={a.id || i} style={{ marginBottom: 6 }}>
                  <ArticleLink article={a} />
                </div>
              ))}
            </div>
            <div style={{ padding: '12px 14px' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: '#ff3131', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>
                Bear Case
              </div>
              {bearArticles.length === 0 ? (
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-dim)' }}>No negative articles.</span>
              ) : bearArticles.map((a, i) => (
                <div key={a.id || i} style={{ marginBottom: 6 }}>
                  <ArticleLink article={a} />
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
