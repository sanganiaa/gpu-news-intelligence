import React from 'react';

const VERDICT_COLOR = {
  BUY:  { text: '#00ff41', bg: 'rgba(0,255,65,0.08)',  glow: 'rgba(0,255,65,0.22)',  shadow: '0 0 20px #00ff41' },
  SELL: { text: '#ff3131', bg: 'rgba(255,49,49,0.08)', glow: 'rgba(255,49,49,0.22)', shadow: '0 0 20px #ff3131' },
  HOLD: { text: '#ffaa00', bg: 'rgba(255,170,0,0.08)', glow: 'rgba(255,170,0,0.22)', shadow: '0 0 20px #ffaa00' },
};

const COMPANY_NAMES = {
  NVDA:  'NVIDIA Corporation',
  AAPL:  'Apple Inc.',
  MSFT:  'Microsoft Corporation',
  META:  'Meta Platforms, Inc.',
  TSLA:  'Tesla, Inc.',
  AMZN:  'Amazon.com, Inc.',
  AMD:   'Advanced Micro Devices',
  GOOGL: 'Alphabet Inc.',
  NFLX:  'Netflix, Inc.',
  PLTR:  'Palantir Technologies',
  INTC:  'Intel Corporation',
  QCOM:  'Qualcomm Incorporated',
  AVGO:  'Broadcom Inc.',
  TSM:   'Taiwan Semiconductor',
  SMCI:  'Super Micro Computer',
};

function pct(v) { return Math.round((Number(v) || 0) * 100); }

export default function HeroSignal({ signal, ticker, loading, updating }) {
  const verdict = signal?.verdict || 'HOLD';
  const vc = VERDICT_COLOR[verdict] || VERDICT_COLOR.HOLD;
  const confidence = pct(signal?.confidence);
  const articleCount = signal?.article_count ?? 0;
  const isLive = !!signal && !loading;
  const companyName = COMPANY_NAMES[ticker] || null;

  return (
    <section style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 0 24px' }}>
      {/* Ticker header — sits above card */}
      <div style={{ width: '100%', maxWidth: 440, marginBottom: 10 }}>
        <div style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 14,
          color: '#666666',
          letterSpacing: '0.1em',
        }}>
          &gt; {ticker}
        </div>
        {companyName && (
          <div style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 11,
            color: '#333333',
            marginTop: 3,
            letterSpacing: '0.05em',
          }}>
            {companyName}
          </div>
        )}
        <div style={{ height: 1, background: '#1f1f1f', marginTop: 8 }} />
      </div>

      {/* Card + glow orb wrapper */}
      <div style={{ position: 'relative', width: '100%', maxWidth: 440 }}>
        {/* radial glow behind card — scaled down 15% from 400px */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: '50%', left: '50%',
            width: 340, height: 340,
            marginTop: -170, marginLeft: -170,
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
            padding: '20px 40px',
            background: vc.bg,
            border: `1px solid ${vc.text}22`,
            textAlign: 'center',
          }}
        >
          {updating && (
            <div style={{
              position: 'absolute',
              top: 8,
              right: 12,
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              color: 'var(--text-dim)',
              letterSpacing: '0.15em',
              opacity: 0.6,
            }}>
              updating...
            </div>
          )}

          {loading && !signal ? (
            <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', fontSize: 12, letterSpacing: '0.2em' }}>
              LOADING…
            </div>
          ) : (
            <>
              {/* Verdict */}
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 600,
                  fontSize: 'clamp(38px, 6vw, 65px)',
                  letterSpacing: '0.45em',
                  color: vc.text,
                  textShadow: vc.shadow,
                  lineHeight: 1,
                  marginBottom: 18,
                }}
              >
                {verdict}
              </div>

              {/* Confidence */}
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 18,
                  fontWeight: 300,
                  color: vc.text,
                  opacity: 0.8,
                  letterSpacing: '0.1em',
                  marginBottom: 12,
                }}
              >
                {confidence}%
              </div>

              {/* Ticker + article count */}
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-secondary)', letterSpacing: '0.08em' }}>
                {ticker}&nbsp;&nbsp;·&nbsp;&nbsp;{articleCount} article{articleCount !== 1 ? 's' : ''}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
