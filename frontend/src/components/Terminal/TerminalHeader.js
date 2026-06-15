import React from 'react';
import SearchBar from '../Dashboard/SearchBar';

const S = {
  header: {
    position: 'sticky',
    top: 0,
    zIndex: 200,
    background: '#0d0d0d',
    borderBottom: '1px solid',
    borderImage: 'linear-gradient(to right, #1f1f1f, #333333, #1f1f1f) 1',
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
    color: '#00ff41',
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

export default function TerminalHeader({ ticker, onTickerChange, isLive }) {
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
            background: isLive ? '#00ff41' : '#333333',
            boxShadow: isLive ? '0 0 8px #00ff41' : 'none',
            animation: isLive ? 'live-blink 2.4s ease-in-out infinite' : 'none',
          }}
          title={isLive ? 'Signal live' : 'Awaiting signal'}
        />
      </div>
    </header>
  );
}
