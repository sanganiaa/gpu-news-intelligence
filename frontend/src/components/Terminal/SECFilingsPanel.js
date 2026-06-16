import React, { useState, useMemo } from 'react';

function isSecFiling(article = {}) {
  if (article.content_type === 'sec_filing') return true;
  if (article.is_filing || article.filing_type) return true;
  const source = String(article.source || '').toLowerCase();
  const title = String(article.title || '').toLowerCase();
  return (
    source.includes('edgar') || source.includes('sec') ||
    /\bsec\b/.test(title) || /\b8-k\b/.test(title) || /\b10-k\b/.test(title) || /\b10-q\b/.test(title)
  );
}

function filingType(article) {
  if (article.filing_type) return article.filing_type;
  const match = String(article.title || '').match(/\b(8-K|10-K|10-Q|S-1|13D|13G)\b/i);
  return match ? match[1].toUpperCase() : '8-K';
}

function extractAccession(article) {
  if (article.accession_number) return article.accession_number;
  const url = article.url || '';
  const match = url.match(/(\d{10}-\d{2}-\d{6})/);
  return match ? match[1] : null;
}

function fmtDate(value) {
  if (!value) return '';
  try {
    return new Date(value).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  } catch { return ''; }
}

export default function SECFilingsPanel({ articles = [], ticker }) {
  const [open, setOpen] = useState(false);

  const filings = useMemo(() =>
    articles
      .filter(isSecFiling)
      .reduce((acc, a) => {
        if (a.id && acc.some(x => x.id === a.id)) return acc;
        acc.push(a);
        return acc;
      }, [])
      .sort((a, b) => new Date(b.published_at || b.ingested_at) - new Date(a.published_at || a.ingested_at)),
    [articles],
  );

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
          SEC Filings
        </div>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-dim)', letterSpacing: '0.06em' }}>
          {filings.length} filing{filings.length !== 1 ? 's' : ''}
        </span>
      </div>

      {open && (
        <>
          <hr className="t-divider" style={{ margin: '0' }} />
          {filings.length === 0 ? (
            <div style={{ padding: '14px', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-dim)' }}>
              No SEC filings in current dataset.
            </div>
          ) : (
            filings.map((filing, i) => {
              const accession = extractAccession(filing);
              const date = fmtDate(filing.published_at || filing.ingested_at);
              const type = filingType(filing);

              return (
                <div
                  key={filing.id || i}
                  style={{
                    padding: '10px 14px',
                    borderBottom: '1px solid var(--border)',
                    display: 'grid',
                    gridTemplateColumns: 'auto auto 1fr auto',
                    alignItems: 'center',
                    gap: 10,
                  }}
                >
                  {/* Ticker badge */}
                  <span style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 10,
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    background: 'var(--border)',
                    padding: '2px 6px',
                    borderRadius: 3,
                    letterSpacing: '0.04em',
                  }}>
                    {filing.ticker || ticker}
                  </span>

                  {/* Filing type badge */}
                  <span style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 9,
                    color: '#ffaa00',
                    background: 'rgba(255,170,0,0.1)',
                    padding: '2px 5px',
                    borderRadius: 3,
                    letterSpacing: '0.04em',
                  }}>
                    {type}
                  </span>

                  {/* Date + accession */}
                  <div style={{ minWidth: 0 }}>
                    {date && (
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-secondary)' }}>
                        {date}
                      </span>
                    )}
                    {accession && (
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-dim)', marginLeft: 8 }}>
                        {accession}
                      </span>
                    )}
                  </div>

                  {/* Original filing link */}
                  {filing.url && (
                    <a
                      href={filing.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 10,
                        color: 'var(--blue)',
                        textDecoration: 'none',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Original filing
                    </a>
                  )}
                </div>
              );
            })
          )}
        </>
      )}
    </div>
  );
}
