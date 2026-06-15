import React from 'react';

const VERDICT_COLOR = {
  BUY:  { text: '#00ff41', bg: 'rgba(0,255,65,0.08)',  glow: 'rgba(0,255,65,0.22)',  shadow: '0 0 20px #00ff41' },
  SELL: { text: '#ff3131', bg: 'rgba(255,49,49,0.08)', glow: 'rgba(255,49,49,0.22)', shadow: '0 0 20px #ff3131' },
  HOLD: { text: '#ffaa00', bg: 'rgba(255,170,0,0.08)', glow: 'rgba(255,170,0,0.22)', shadow: '0 0 20px #ffaa00' },
};

function pct(v) { return Math.round((Number(v) || 0) * 100); }

export default function HeroSignal({ signal, ticker, loading }) {
  const verdict = signal?.verdict || 'HOLD';
  const vc = VERDICT_COLOR[verdict] || VERDICT_COLOR.HOLD;
  const confidence = pct(signal?.confidence);
  const articleCount = signal?.article_count ?? 0;
  const isLive = !!signal && !loading;

  return (
    <section style={{ position: 'relative', display: 'flex', justifyContent: 'center', padding: '48px 0 32px' }}>
      {/* radial glow behind card */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: '50%', left: '50%',
          width: 520, height: 520,
          marginTop: -260, marginLeft: -260,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${vc.glow} 0%, transparent 70%)`,
          animation: isLive ? 'glow-pulse 3s ease-in-out infinite' : 'none',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      <div
        className="t-card"
        style={{
          position: 'relative',
          zIndex: 1,
          width: '100%',
          maxWidth: 540,
          padding: '40px 48px',
          background: vc.bg,
          border: `1px solid ${vc.text}22`,
          textAlign: 'center',
        }}
      >
        {loading && !signal ? (
          <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', fontSize: 14, letterSpacing: '0.2em' }}>
            LOADING…
          </div>
        ) : (
          <>
            {/* Verdict */}
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontWeight: 600,
                fontSize: 'clamp(56px, 9vw, 96px)',
                letterSpacing: '0.45em',
                color: vc.text,
                textShadow: vc.shadow,
                lineHeight: 1,
                marginBottom: 24,
              }}
            >
              {verdict}
            </div>

            {/* Confidence */}
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 28,
                fontWeight: 300,
                color: vc.text,
                opacity: 0.8,
                letterSpacing: '0.1em',
                marginBottom: 16,
              }}
            >
              {confidence}%
            </div>

            {/* Ticker + article count */}
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)', letterSpacing: '0.08em' }}>
              {ticker}&nbsp;&nbsp;·&nbsp;&nbsp;{articleCount} article{articleCount !== 1 ? 's' : ''}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
