import React from 'react';

const verdictStyle = {
  BUY:  { bg: '#EAF3DE', color: '#27500A', bar: '#3B6D11' },
  HOLD: { bg: '#FAEEDA', color: '#633806', bar: '#BA7517' },
  SELL: { bg: '#FCEBEB', color: '#791F1F', bar: '#A32D2D' },
};

function pct(value) {
  return Math.round((Number(value) || 0) * 100);
}

function formatTime(value) {
  if (!value) return '';
  return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function ActiveSignals({ ticker, signals = [], loading, error }) {
  const isInList = signals.find(s => s.ticker === ticker);

  return (
    <div className="card">
      <div className="card-title">
        Active signals · <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>{ticker}</span>
        <span style={{ fontSize: 10 }}>{loading ? 'loading' : `${signals.length} tickers`}</span>
      </div>
      {error && (
        <div style={{ padding: '0 0 8px', fontSize: 11, color: 'var(--red-text)' }}>
          Signal service unavailable: {error.message}
        </div>
      )}
      {!loading && signals.length === 0 && (
        <div style={{ padding: '8px 0', fontSize: 11, color: 'var(--text-secondary)' }}>
          No generated signals available.
        </div>
      )}
      {signals.map(s => {
        const vs = verdictStyle[s.verdict] || verdictStyle.HOLD;
        const isSelected = s.ticker === ticker;
        const confidence = pct(s.confidence);
        const latest = s.supporting_articles?.[0];
        return (
          <div
            key={s.ticker}
            style={{
              display: 'grid', gridTemplateColumns: '44px 46px 1fr 38px', alignItems: 'center', gap: 8,
              padding: '6px 0', borderBottom: '0.5px solid var(--border)',
              fontSize: 12,
              background: isSelected ? 'var(--surface-2)' : 'transparent',
              borderRadius: isSelected ? 4 : 0,
              paddingLeft: isSelected ? 6 : 0,
              transition: 'all 0.2s',
            }}
          >
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 500, width: 44, color: 'var(--text-primary)' }}>{s.ticker}</span>
            <span style={{ fontSize: 10, fontWeight: 500, background: vs.bg, color: vs.color, padding: '2px 7px', borderRadius: 4, minWidth: 36, textAlign: 'center' }}>{s.verdict}</span>
            <div>
              <div style={{ height: 4, background: 'var(--surface-2)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${confidence}%`, background: vs.bar, borderRadius: 3 }} />
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-hint)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 3 }}>
                {latest?.title || 'No supporting article'} {formatTime(s.generated_at)}
              </div>
            </div>
            <span style={{ fontSize: 10, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', width: 32, textAlign: 'right' }}>{confidence}%</span>
          </div>
        );
      })}
      {!loading && !isInList && (
        <div style={{ padding: '8px 0', fontSize: 11, color: 'var(--text-secondary)', borderTop: '0.5px solid var(--border)', marginTop: 4 }}>
          No signal yet for <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 500, color: 'var(--text-primary)' }}>{ticker}</span>.
          {/* TODO: backend signal response does not include company_name; add it when available. */}
        </div>
      )}
    </div>
  );
}
