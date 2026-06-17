import React from 'react';
import SearchBar from '../Dashboard/SearchBar';

const S = {
  header: {
    position: 'sticky',
    top: 0,
    zIndex: 200,
    background: '#000000',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 24px',
    height: 56,
  },
  wordmark: {
    fontFamily: 'var(--font-mono)',
    fontSize: 13,
    fontWeight: 500,
    color: '#e0e0e0',
    letterSpacing: '0.08em',
    userSelect: 'none',
  },
  prompt: {
    color: '#555555',
    marginRight: 6,
  },
  right: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: '50%',
    flexShrink: 0,
  },
};

export default function TerminalHeader({ ticker, onTickerChange, isLive, signalColor = '#444444' }) {
  const dotColor = isLive ? signalColor : '#333333';

  return (
    <header style={S.header}>
      <span style={S.wordmark}>
        <span style={S.prompt}>&gt;</span>
        FINANCIAL NEWS INTELLIGENCE
      </span>
      <div style={S.right}>
        <SearchBar value={ticker} onChange={onTickerChange} />
        <span
          style={{
            ...S.liveDot,
            background: dotColor,
            boxShadow: isLive ? `0 0 8px ${signalColor}` : 'none',
            animation: isLive ? 'live-blink 2.4s ease-in-out infinite' : 'none',
          }}
          title={isLive ? 'Signal live' : 'Awaiting signal'}
        />
      </div>
    </header>
  );
}
