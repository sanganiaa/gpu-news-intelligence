import React, { useState } from 'react';

const VERDICT_COLOR = {
  BUY:  '#00ff41',
  SELL: '#ff3131',
  HOLD: '#ffaa00',
};

const LS_FAV_KEY = 'tickerFavorites';

function loadFavorites() {
  try {
    const stored = localStorage.getItem(LS_FAV_KEY);
    const parsed = stored ? JSON.parse(stored) : null;
    return Array.isArray(parsed) ? new Set(parsed) : new Set();
  } catch { return new Set(); }
}

function pct(v) { return Math.round((Number(v) || 0) * 100); }

export default function RecentSignalsPanel({
  recentTickers = [],
  signalsByTicker = {},
  ingestStatusByTicker = {},
  ticker,
  onTickerClick,
}) {
  const [favorites, setFavorites] = useState(() => loadFavorites());

  function toggleFavorite(e, t) {
    e.stopPropagation();
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      try { localStorage.setItem(LS_FAV_KEY, JSON.stringify([...next])); } catch {}
      return next;
    });
  }

  return (
    <div className="t-card" style={{ overflow: 'hidden' }}>
      <div style={{ padding: '14px 14px 0' }}>
        <div className="t-card-title" style={{ color: '#555555' }}>Recent Tickers</div>
        <hr className="t-divider" style={{ margin: '0 -14px 0' }} />
      </div>

      {recentTickers.length === 0 && (
        <div style={{ padding: '16px 14px', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-dim)' }}>
          No tickers yet.
        </div>
      )}

      {recentTickers.map(t => {
        const signal = signalsByTicker[t];
        const isSelected = t === ticker;
        const ingestStatus = ingestStatusByTicker[t];
        const isFav = favorites.has(t);

        return (
          <div
            key={t}
            onClick={() => onTickerClick?.(t)}
            className={`recent-row${isSelected ? ' is-selected' : ''}`}
            style={{
              display: 'grid',
              gridTemplateColumns: '14px 52px 1fr 42px 20px',
              alignItems: 'center',
              gap: 6,
              padding: '8px 10px 8px 0',
              borderBottom: '1px solid var(--border)',
              borderLeft: isSelected ? '3px solid #00ff41' : '3px solid transparent',
              background: isSelected ? 'rgba(0,255,65,0.08)' : 'transparent',
              cursor: 'pointer',
              transition: 'background 0.15s',
              paddingLeft: isSelected ? 10 : 13,
            }}
          >
            {/* Spacer for left-border alignment */}
            <span />

            {/* Ticker */}
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              fontWeight: isSelected ? 600 : 500,
              color: '#e0e0e0',
              letterSpacing: '0.05em',
            }}>
              {t}
            </span>

            {/* Verdict or status */}
            {signal ? (
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                fontWeight: 600,
                color: VERDICT_COLOR[signal.verdict] || '#ffaa00',
                letterSpacing: '0.08em',
              }}>
                {signal.verdict}
              </span>
            ) : ingestStatus === 'loading' ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{
                  width: 5, height: 5, borderRadius: '50%',
                  background: '#00ff41',
                  flexShrink: 0,
                  animation: 'ingest-pulse 1.2s ease-in-out infinite',
                }} />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-secondary)' }}>…</span>
              </span>
            ) : (
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#333333' }}>—</span>
            )}

            {/* Confidence */}
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              color: signal ? (VERDICT_COLOR[signal.verdict] || 'var(--text-secondary)') : 'var(--text-dim)',
              textAlign: 'right',
              opacity: signal ? 0.8 : 1,
            }}>
              {signal ? `${pct(signal.confidence)}%` : ''}
            </span>

            {/* Favorite star */}
            <button
              type="button"
              onClick={e => toggleFavorite(e, t)}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                fontSize: 11,
                color: isFav ? 'rgba(0,255,65,0.8)' : 'rgba(0,255,65,0.3)',
                padding: 0,
                lineHeight: 1,
                opacity: 1,
                transition: 'opacity 0.15s, color 0.15s',
              }}
              title={isFav ? 'Unfavorite' : 'Favorite'}
            >
              ★
            </button>
          </div>
        );
      })}
    </div>
  );
}
