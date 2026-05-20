import React from 'react';

const srcStyle = {
  yahoo:   { bg: '#E6F1FB', color: '#0C447C' },
  newsapi: { bg: '#EEEDFE', color: '#3C3489' },
  edgar:   { bg: '#FAEEDA', color: '#633806' },
};

const sentStyle = {
  pos: { bg: '#EAF3DE', color: '#27500A' },
  neg: { bg: '#FCEBEB', color: '#791F1F' },
  neu: { bg: 'var(--surface-2)', color: 'var(--text-secondary)' },
};

function sourceClass(source = '') {
  const s = source.toLowerCase();
  if (s.includes('edgar')) return 'edgar';
  if (s.includes('newsapi')) return 'newsapi';
  return 'yahoo';
}

function sourceLabel(source = '') {
  const s = source.toLowerCase();
  if (s.includes('edgar')) return 'EDGAR';
  if (s.includes('newsapi')) return 'NewsAPI';
  if (s.includes('yahoo')) return 'Yahoo';
  return source || 'source';
}

function sentimentShort(article) {
  if (article.sentiment === 'positive') return 'pos';
  if (article.sentiment === 'negative') return 'neg';
  if (article.sentiment === 'neutral') return 'neu';
  return 'raw';
}

export default function IngestionFeed({ articles = [], ticker, loading, error }) {
  return (
    <div className="card" style={{ gridColumn: 'span 2' }}>
      <div className="card-title">
        Live ingestion feed · <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>{ticker}</span>
        <span style={{ fontSize: 10 }}>{loading ? 'loading' : `${articles.length} latest`}</span>
      </div>
      {error && (
        <div style={{ fontSize: 11, color: 'var(--red-text)', padding: '0 0 8px' }}>
          News service unavailable: {error.message}
        </div>
      )}
      {!loading && articles.length === 0 ? (
        <div style={{ fontSize: 11, color: 'var(--text-secondary)', padding: '8px 0' }}>
          No articles available for {ticker}.
        </div>
      ) : (
        articles.map(a => {
          const ss = srcStyle[sourceClass(a.source)] || srcStyle.yahoo;
          const se = sentStyle[sentimentShort(a)] || sentStyle.neu;
          return (
            <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', borderBottom: '0.5px solid var(--border)', fontSize: 11 }}>
              <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 3, fontFamily: 'var(--font-mono)', background: ss.bg, color: ss.color, flexShrink: 0 }}>{sourceLabel(a.source)}</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 500, width: 36, color: 'var(--text-primary)', flexShrink: 0 }}>{a.ticker}</span>
              <span style={{ flex: 1, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.title}</span>
              <span style={{ fontSize: 10, padding: '1px 5px', borderRadius: 3, background: se.bg, color: se.color, flexShrink: 0 }}>{sentimentShort(a)}</span>
            </div>
          );
        })
      )}
    </div>
  );
}
