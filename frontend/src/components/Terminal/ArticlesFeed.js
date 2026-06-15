import React from 'react';

function sourceLabel(article) {
  if (article.content_type === 'sec_filing' || article.source === 'sec_edgar') return 'SEC';
  if (article.source === 'finnhub') return 'Finnhub';
  return 'Yahoo';
}

function fmtScore(n) {
  if (n == null || Number.isNaN(Number(n))) return null;
  const val = Number(n);
  return `${val >= 0 ? '+' : ''}${val.toFixed(2)}`;
}

function fmtTime(value) {
  if (!value) return '';
  try {
    return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

export default function ArticlesFeed({ articles = [], signal }) {
  const displayArticles = articles.slice(0, 10);

  return (
    <div className="t-card" style={{ overflow: 'hidden' }}>
      <div style={{ padding: '14px 14px 0' }}>
        <div className="t-card-title">
          Supporting Articles
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
        const netScore = article.net_sentiment ?? (
          article.positive != null ? article.positive - article.negative : null
        );
        const scoreStr = fmtScore(netScore);
        const scoreColor = netScore == null ? 'var(--text-dim)'
          : netScore > 0.05 ? '#00ff41'
          : netScore < -0.05 ? '#ff3131'
          : '#ffaa00';
        const src = sourceLabel(article);

        return (
          <div
            key={article.id || article.url || i}
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 46px',
              alignItems: 'start',
              gap: 10,
              padding: '9px 14px',
              borderBottom: '1px solid var(--border)',
            }}
          >
            {/* Left: prefix + headline + source */}
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, minWidth: 0 }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#00ff41', flexShrink: 0 }}>
                  &gt;
                </span>
                <a
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 11,
                    color: 'var(--text-primary)',
                    textDecoration: 'none',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    display: 'block',
                  }}
                  title={article.title}
                >
                  {article.title || '—'}
                </a>
              </div>
              <div style={{ marginTop: 3, display: 'flex', alignItems: 'center', gap: 8 }}>
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
            </div>

            {/* Right: sentiment score */}
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              {scoreStr ? (
                <span style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  fontWeight: 500,
                  color: scoreColor,
                }}>
                  {scoreStr}
                </span>
              ) : (
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-dim)' }}>—</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
