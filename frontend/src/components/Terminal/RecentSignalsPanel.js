import React from 'react';

const VERDICT_COLOR = {
  BUY:  '#00ff41',
  SELL: '#ff3131',
  HOLD: '#ffaa00',
};

function pct(v) { return Math.round((Number(v) || 0) * 100); }

function Row({ label, children, isSelected }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '56px 1fr 40px',
        alignItems: 'center',
        gap: 10,
        padding: '7px 10px',
        borderBottom: '1px solid var(--border)',
        background: isSelected ? 'rgba(255,255,255,0.03)' : 'transparent',
        cursor: 'pointer',
        transition: 'background 0.15s',
      }}
    >
      {children}
    </div>
  );
}

export default function RecentSignalsPanel({
  recentTickers = [],
  signalsByTicker = {},
  ingestStatusByTicker = {},
  ticker,
  onTickerClick,
}) {
  return (
    <div className="t-card" style={{ overflow: 'hidden' }}>
      <div style={{ padding: '14px 14px 0' }}>
        <div className="t-card-title">Recent Signals</div>
        <hr className="t-divider" style={{ margin: '0 -14px 0' }} />
      </div>

      {recentTickers.length === 0 && (
        <div style={{ padding: '16px 14px', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-dim)' }}>
          No tickers searched yet.
        </div>
      )}

      {recentTickers.map(t => {
        const signal = signalsByTicker[t];
        const isSelected = t === ticker;
        const ingestStatus = ingestStatusByTicker[t];

        return (
          <div
            key={t}
            onClick={() => onTickerClick?.(t)}
            style={{
              display: 'grid',
              gridTemplateColumns: '56px 1fr 46px',
              alignItems: 'center',
              gap: 10,
              padding: '8px 14px',
              borderBottom: '1px solid var(--border)',
              background: isSelected ? 'rgba(255,255,255,0.03)' : 'transparent',
              cursor: 'pointer',
              transition: 'background 0.15s',
            }}
          >
            {/* Ticker */}
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              fontWeight: 500,
              color: 'var(--text-primary)',
              letterSpacing: '0.05em',
            }}>
              {t}
            </span>

            {/* Verdict or status */}
            {signal ? (
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                fontWeight: 500,
                color: VERDICT_COLOR[signal.verdict] || '#ffaa00',
                letterSpacing: '0.08em',
              }}>
                {signal.verdict}
              </span>
            ) : ingestStatus === 'loading' ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: 'var(--blue)',
                  flexShrink: 0,
                  animation: 'ingest-pulse 1.2s ease-in-out infinite',
                }} />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-secondary)' }}>fetching…</span>
              </span>
            ) : (
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-dim)' }}>—</span>
            )}

            {/* Confidence */}
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              color: signal ? (VERDICT_COLOR[signal.verdict] || 'var(--text-secondary)') : 'var(--text-dim)',
              textAlign: 'right',
              opacity: signal ? 0.75 : 1,
            }}>
              {signal ? `${pct(signal.confidence)}%` : ''}
            </span>
          </div>
        );
      })}
    </div>
  );
}
