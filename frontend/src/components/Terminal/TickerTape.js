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
  const verdictColor = verdict ? (VERDICT_COLOR[verdict] || '#ffaa00') : '#444444';

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center' }}>
      <span style={{ color: '#666666', marginRight: 8 }}>{t}</span>
      <span style={{ color: verdictColor, fontWeight: 600, marginRight: 8 }}>{verdict || '—'}</span>
      <span style={{ color: '#555555', marginRight: 8 }}>
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
        borderBottom: '1px solid rgba(255,255,255,0.06)',
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
