import React from 'react';

const VERDICT_COLOR = {
  BUY:  {
    text:   '#00ff41',
    glow:   'rgba(0,255,65,0.12)',
    border: 'rgba(0,255,65,0.15)',
    top:    'rgba(0,255,65,0.3)',
    shadow: '0 0 20px rgba(0,255,65,0.9)',
  },
  SELL: {
    text:   '#ff3131',
    glow:   'rgba(255,49,49,0.12)',
    border: 'rgba(255,49,49,0.15)',
    top:    'rgba(255,49,49,0.3)',
    shadow: '0 0 20px rgba(255,49,49,0.9)',
  },
  HOLD: {
    text:   '#ffaa00',
    glow:   'rgba(255,170,0,0.12)',
    border: 'rgba(255,170,0,0.15)',
    top:    'rgba(255,170,0,0.3)',
    shadow: '0 0 20px rgba(255,170,0,0.9)',
  },
};
const DEFAULT_VC = {
  text:   '#666666',
  glow:   'rgba(255,255,255,0.05)',
  border: 'rgba(255,255,255,0.08)',
  top:    'rgba(255,255,255,0.12)',
  shadow: 'none',
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
  const verdict = signal?.verdict || null;
  const vc = (verdict && VERDICT_COLOR[verdict]) || DEFAULT_VC;
  const confidence = pct(signal?.confidence);
  const articleCount = signal?.article_count ?? 0;
  const isLive = !!signal && !loading;
  const companyName = COMPANY_NAMES[ticker] || null;

  return (
    <section style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 0 24px' }}>
      {/* Ticker header — sits above card */}
      <div style={{ width: '100%', maxWidth: 440, marginBottom: 10 }}>
        <div style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 14,
          color: '#e0e0e0',
          letterSpacing: '0.1em',
        }}>
          <span style={{ color: '#555555' }}>&gt;</span>
          {' '}{ticker}
        </div>
        {companyName && (
          <div style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 11,
            color: '#555555',
            marginTop: 3,
            letterSpacing: '0.05em',
          }}>
            {companyName}
          </div>
        )}
        <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', marginTop: 8 }} />
      </div>

      {/* Card + glow orb wrapper */}
      <div style={{ position: 'relative', width: '100%', maxWidth: 440 }}>
        {/* Radial glow behind card — colour follows the signal */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: '50%', left: '50%',
            width: 280, height: 280,
            marginTop: -140, marginLeft: -140,
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
            padding: '16px 32px',
            /* Override .t-card defaults with signal-reactive values */
            background: vc.glow,
            border: `1px solid ${vc.border}`,
            borderTop: `1px solid ${vc.top}`,
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
              color: '#555555',
              letterSpacing: '0.15em',
              opacity: 0.6,
            }}>
              updating...
            </div>
          )}

          {loading && !signal ? (
            <div style={{ fontFamily: 'var(--font-mono)', color: '#444444', fontSize: 12, letterSpacing: '0.2em' }}>
              LOADING…
            </div>
          ) : (
            <>
              {/* Verdict */}
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 600,
                  fontSize: 'clamp(32px, 5vw, 55px)',
                  letterSpacing: '0.45em',
                  color: vc.text,
                  textShadow: vc.shadow,
                  lineHeight: 1,
                  marginBottom: 18,
                }}
              >
                {verdict || '—'}
              </div>

              {/* Confidence */}
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 16,
                  fontWeight: 300,
                  color: vc.text,
                  opacity: 0.8,
                  letterSpacing: '0.1em',
                  marginBottom: 12,
                }}
              >
                {signal ? `${confidence}%` : '—'}
              </div>

              {/* Ticker + article count */}
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#555555', letterSpacing: '0.08em' }}>
                {ticker}&nbsp;&nbsp;·&nbsp;&nbsp;{articleCount} article{articleCount !== 1 ? 's' : ''}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
