import React, { useEffect, useState } from 'react';

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

export default function ActiveSignals({
  ticker,
  recentTickers = [],
  signalsByTicker = {},
  loading,
  error,
  onTickerClick,
}) {
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    setTimedOut(false);
    const hasSomeSignal = recentTickers.some(t => signalsByTicker[t]);
    if (!loading || hasSomeSignal) return undefined;
    const id = setTimeout(() => setTimedOut(true), 10000);
    return () => clearTimeout(id);
  }, [loading, recentTickers, signalsByTicker]);

  const hasSomeSignal = recentTickers.some(t => signalsByTicker[t]);

  return (
    <div className="card">
      <div className="card-title">
        Active signals · <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>{ticker}</span>
        <span style={{ fontSize: 10 }}>
          {loading && !hasSomeSignal ? 'loading' : `${recentTickers.length} ticker${recentTickers.length !== 1 ? 's' : ''}`}
        </span>
      </div>

      {error && (
        <div style={{ padding: '0 0 8px', fontSize: 11, color: 'var(--red-text)' }}>
          Signal service unavailable: {error.message}
        </div>
      )}

      {(!loading || timedOut) && recentTickers.length === 0 && (
        <div style={{ padding: '8px 0', fontSize: 11, color: 'var(--text-secondary)' }}>
          No tickers searched yet.
        </div>
      )}

      {recentTickers.map((t, i) => {
        const s = signalsByTicker[t];
        const isSelected = t === ticker;

        if (!s) {
          return (
            <div
              key={t}
              style={{
                display: 'grid', gridTemplateColumns: '44px 46px 1fr 38px', alignItems: 'center', gap: 8,
                padding: '6px 0', borderBottom: '0.5px solid var(--border)',
                fontSize: 12,
                background: isSelected ? 'var(--surface-2)' : 'transparent',
                borderRadius: isSelected ? 4 : 0,
                paddingLeft: isSelected ? 6 : 0,
                opacity: 0.5,
              }}
            >
              <button
                type="button"
                onClick={() => onTickerClick?.(t)}
                style={{ fontFamily: 'var(--font-mono)', fontWeight: 500, width: 44, color: 'var(--text-primary)', background: 'transparent', border: 0, padding: 0, textAlign: 'left', cursor: onTickerClick ? 'pointer' : 'default' }}
              >
                {t}
              </button>
              <span style={{ fontSize: 10, color: 'var(--text-hint)' }}>—</span>
              <span style={{ fontSize: 10, color: 'var(--text-hint)' }}>fetching…</span>
            </div>
          );
        }

        const vs = verdictStyle[s.verdict] || verdictStyle.HOLD;
        const confidence = pct(s.confidence);
        const latest = s.supporting_articles?.[0];

        return (
          <div
            key={t}
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
            <button
              type="button"
              onClick={() => onTickerClick?.(t)}
              style={{
                fontFamily: 'var(--font-mono)', fontWeight: 500, width: 44,
                color: 'var(--text-primary)', background: 'transparent', border: 0,
                padding: 0, textAlign: 'left', cursor: onTickerClick ? 'pointer' : 'default',
              }}
            >
              {t}
            </button>
            <span style={{ fontSize: 10, fontWeight: 500, background: vs.bg, color: vs.color, padding: '2px 7px', borderRadius: 4, minWidth: 36, textAlign: 'center' }}>
              {s.verdict}
            </span>
            <div>
              <div style={{ height: 4, background: 'var(--surface-2)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${confidence}%`, background: vs.bar, borderRadius: 3 }} />
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-hint)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 3 }}>
                {latest?.title || 'No supporting article'}{' '}
                {formatTime(s.generated_at)}
              </div>
            </div>
            <span style={{ fontSize: 10, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', width: 32, textAlign: 'right' }}>
              {confidence}%
            </span>
          </div>
        );
      })}
    </div>
  );
}
