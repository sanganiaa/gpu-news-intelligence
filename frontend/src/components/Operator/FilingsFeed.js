import React, { useMemo } from 'react';

function formatTime(value) {
  if (!value) return 'filed time n/a';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'filed time n/a';
  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function filingType(article) {
  if (article.filing_type) return article.filing_type;
  const match = String(article.title || '').match(/\b(8-K|10-K|10-Q|S-1|13D|13G)\b/i);
  return match ? match[1].toUpperCase() : 'SEC filing';
}

export default function FilingsFeed({ articles = [], loading, error }) {
  const filings = useMemo(
    () => articles
      .filter(article => article.content_type === 'sec_filing')
      .sort((a, b) => new Date(b.published_at || b.ingested_at) - new Date(a.published_at || a.ingested_at)),
    [articles],
  );

  return (
    <details className="card" style={{ marginBottom: 12, background: 'var(--surface-2)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
      <summary
        style={{
          cursor: 'pointer',
          listStyle: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '.05em',
          textTransform: 'uppercase',
        }}
      >
        <span>SEC Filings Processed</span>
        <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-hint)' }}>
          {loading ? 'loading' : `${filings.length} filings`}
        </span>
      </summary>

      {error && (
        <div style={{ fontSize: 11, color: 'var(--red-text)', padding: '0 0 8px' }}>
          Filing feed may be stale: {error.message}
        </div>
      )}

      {!loading && filings.length === 0 ? (
        <div style={{ fontSize: 11, color: 'var(--text-secondary)', padding: '8px 0', borderTop: '0.5px solid var(--border)' }}>
          No SEC filings processed in the current article set.
        </div>
      ) : filings.map(filing => (
        <div
          key={filing.id}
          style={{
            background: 'rgba(255,255,255,0.55)',
            border: '0.5px solid var(--border)',
            borderRadius: 8,
            padding: 10,
            marginTop: 8,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, color: 'var(--text-primary)' }}>{filing.ticker}</span>
            <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 4, background: 'var(--amber-bg)', color: 'var(--amber-text)', fontFamily: 'var(--font-mono)' }}>
              {filingType(filing)}
            </span>
            <span style={{ fontSize: 10, color: 'var(--text-hint)', fontFamily: 'var(--font-mono)', marginLeft: 'auto' }}>{formatTime(filing.published_at || filing.ingested_at)}</span>
          </div>
          <div style={{ fontSize: 12, lineHeight: 1.4, color: 'var(--text-primary)', fontWeight: 600, marginBottom: 5 }}>
            {filing.title}
          </div>
          <div style={{ fontSize: 11, lineHeight: 1.45, color: 'var(--text-secondary)', marginBottom: 7 }}>
            {filing.summary_ai || filing.summary || 'AI filing summary pending.'}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 10, lineHeight: 1.4, padding: '2px 7px', borderRadius: 4, background: 'var(--surface)', color: 'var(--text-secondary)' }}>
              {filing.investment_implication || 'Investment implication pending'}
            </span>
            <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 4, background: 'var(--blue-bg)', color: 'var(--blue-text)', fontFamily: 'var(--font-mono)' }}>
              {filing.catalyst_tag || 'other'}
            </span>
            {filing.url && (
              <a
                href={filing.url}
                target="_blank"
                rel="noreferrer"
                style={{ fontSize: 10, color: 'var(--blue-text)', marginLeft: 'auto', textDecoration: 'none' }}
              >
                Original filing
              </a>
            )}
          </div>
        </div>
      ))}
    </details>
  );
}
