import React from 'react';

const TICKERS = ['NVDA', 'AAPL', 'MSFT', 'META', 'TSLA', 'AMZN', 'AMD', 'GOOGL', 'NFLX', 'PLTR'];

const VERDICT_COLOR = {
  BUY:  '#00ff41',
  SELL: '#ff3131',
  HOLD: '#ffaa00',
};

function pct(v) { return Math.round((Number(v) || 0) * 100); }

function TapeItem({ t, signal }) {
  const verdict = signal?.verdict;
  const color = verdict ? (VERDICT_COLOR[verdict] || '#ffaa00') : 'var(--text-dim)';

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center' }}>
      <span style={{ color: '#999999', marginRight: 8 }}>{t}</span>
      <span style={{ color, fontWeight: 600, marginRight: 8 }}>{verdict || '—'}</span>
      <span style={{ color: verdict ? 'rgba(0,255,65,0.5)' : 'var(--text-dim)', marginRight: 8 }}>
        {signal ? `${pct(signal.confidence)}%` : '—'}
      </span>
      <span style={{ color: '#333333', marginRight: 8 }}>·</span>
    </span>
  );
}

export default function TickerTape({ signalsByTicker = {} }) {
  // Duplicate the list so the scroll animation (translateX -50%) loops seamlessly
  const items = [...TICKERS, ...TICKERS];

  return (
    <div
      style={{
        width: '100%',
        height: 36,
        background: '#000000',
        borderBottom: '1px solid rgba(0,255,65,0.08)',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        whiteSpace: 'nowrap',
      }}
    >
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 11,
          letterSpacing: '0.1em',
          animation: 'tape-scroll 30s linear infinite',
          willChange: 'transform',
        }}
      >
        {items.map((t, i) => (
          <TapeItem key={`${t}-${i}`} t={t} signal={signalsByTicker[t]} />
        ))}
      </div>
    </div>
  );
}
