import React from 'react';

function stripHtml(value) {
  if (!value) return '';
  return String(value)
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractHref(value) {
  if (!value) return null;
  const match = String(value).match(/href=["']([^"']+)["']/i);
  return match ? match[1] : null;
}

function sourceLabel(article) {
  if (article.content_type === 'sec_filing' || article.source === 'sec_edgar') return 'SEC';
  const s = String(article.source || '').toLowerCase();
  if (s.includes('finnhub')) return 'Finnhub';
  if (s.includes('edgar') || s.includes('sec')) return 'SEC';
  return 'Yahoo';
}

function fmtTime(value) {
  if (!value) return '';
  try {
    return new Date(value).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

function pct(v) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(Math.max(0, Math.min(n, 1)) * 100) : 0;
}

function SentimentBar({ article }) {
  const pos = pct(article.positive);
  const neg = pct(article.negative);
  const neu = pct(article.neutral);
  if (pos === 0 && neg === 0 && neu === 0) return null;

  return (
    <div style={{ marginTop: 6 }}>
      <div style={{ display: 'flex', height: 4, overflow: 'hidden', borderRadius: 3, background: 'var(--border)' }}>
        <div style={{ width: `${pos}%`, background: '#00ff41' }} />
        <div style={{ width: `${neg}%`, background: '#ff3131' }} />
        <div style={{ width: `${neu}%`, background: '#444' }} />
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 4, fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-dim)' }}>
        <span style={{ color: '#00ff41' }}>pos {pos}%</span>
        <span style={{ color: '#ff3131' }}>neg {neg}%</span>
        <span>neu {neu}%</span>
      </div>
    </div>
  );
}

export default function ArticlesFeed({ articles = [], signal }) {
  const displayArticles = articles
    .filter(a => !(a.content_type === 'sec_filing' || a.is_filing || a.filing_type ||
      String(a.source || '').toLowerCase().includes('edgar')))
    .slice(0, 5);

  return (
    <div className="t-card" style={{ overflow: 'hidden' }}>
      <div style={{ padding: '14px 14px 0' }}>
        <div className="t-card-title">
          Live Ingestion Feed
          {signal && (
            <span style={{ color: 'var(--text-dim)', letterSpacing: '0.04em' }}>
              {signal.ticker}
            </span>
          )}
        </div>
        <hr className="t-divider" style={{ margin: '0 -14px 0' }} />
      </div>

      {displayArticles.length === 0 && (
        <div style={{ padding: '16px 14px', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-dim)' }}>
          No articles loaded.
        </div>
      )}

      {displayArticles.map((article, i) => {
        const rawTitle = article.title || '';
        const href = extractHref(rawTitle) || article.url || null;
        const title = stripHtml(rawTitle) || '—';
        const src = sourceLabel(article);

        return (
          <div
            key={article.id || article.url || i}
            style={{
              padding: '10px 14px',
              borderBottom: '1px solid var(--border)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, minWidth: 0 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#00ff41', flexShrink: 0 }}>
                &gt;
              </span>
              {href ? (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 11,
                    color: 'var(--text-primary)',
                    textDecoration: 'none',
                    lineHeight: 1.4,
                    display: 'block',
                  }}
                >
                  {title}
                </a>
              ) : (
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-primary)', lineHeight: 1.4 }}>
                  {title}
                </span>
              )}
            </div>

            <div style={{ marginTop: 5, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 9,
                color: 'var(--text-dim)',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                background: 'var(--border)',
                padding: '1px 5px',
                borderRadius: 3,
              }}>
                {src}
              </span>
              {article.published_at && (
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-dim)' }}>
                  {fmtTime(article.published_at)}
                </span>
              )}
            </div>

            <SentimentBar article={article} />
          </div>
        );
      })}
    </div>
  );
}
