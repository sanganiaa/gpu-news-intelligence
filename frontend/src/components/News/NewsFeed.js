import React from 'react';

const sentimentStyle = {
  positive: { bg: '#dcfce7', color: '#15803d' },
  negative: { bg: '#fee2e2', color: '#b91c1c' },
  neutral:  { bg: '#f0ede8', color: '#6b6860' },
};

function timeAgo(isoString) {
  const diff = Date.now() - new Date(isoString).getTime();
  const h = Math.floor(diff / 3600000);
  const m = Math.floor(diff / 60000);
  if (h > 0) return `${h}h ago`;
  if (m > 0) return `${m}m ago`;
  return 'just now';
}

function Article({ article }) {
  const sent = sentimentStyle[article.sentiment] || sentimentStyle.neutral;
  return (
    <div style={{ padding: '13px 0', borderBottom: '0.5px solid var(--border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
        {article.isFiling && (
          <span style={{ fontSize: 10, fontWeight: 500, background: '#dbeafe', color: '#1d4ed8', padding: '2px 6px', borderRadius: 4, fontFamily: 'var(--font-mono)' }}>
            8-K
          </span>
        )}
        <span style={{ fontSize: 11, color: 'var(--text-hint)', fontFamily: 'var(--font-mono)' }}>{article.source}</span>
        <span style={{ fontSize: 11, color: 'var(--text-hint)' }}>·</span>
        <span style={{ fontSize: 11, color: 'var(--text-hint)' }}>{timeAgo(article.published_at)}</span>
        <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 500, background: sent.bg, color: sent.color, padding: '2px 7px', borderRadius: 4 }}>
          {article.sentiment}
        </span>
      </div>
      <div style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--text-primary)' }}>
        {article.title}
      </div>
    </div>
  );
}

export default function NewsFeed({ ticker, articles }) {
  return (
    <div className="card" style={{ maxHeight: 420, overflowY: 'auto' }}>
      <div className="label" style={{ marginBottom: 4 }}>News · {ticker}</div>
      <div style={{ fontSize: 12, color: 'var(--text-hint)', marginBottom: 8 }}>
        Yahoo Finance · NewsAPI · SEC EDGAR
      </div>
      {articles.length === 0 ? (
        <div style={{ color: 'var(--text-hint)', fontSize: 13, padding: '20px 0' }}>No articles yet — ingestion running...</div>
      ) : (
        articles.map(a => <Article key={a.id} article={a} />)
      )}
    </div>
  );
}
