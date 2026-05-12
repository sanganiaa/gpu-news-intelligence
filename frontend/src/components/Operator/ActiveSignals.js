import React from 'react';

const SIGNALS = [
  { ticker: 'NVDA', verdict: 'BUY',  conf: 87 },
  { ticker: 'PLTR', verdict: 'BUY',  conf: 81 },
  { ticker: 'MSFT', verdict: 'BUY',  conf: 74 },
  { ticker: 'AMZN', verdict: 'HOLD', conf: 63 },
  { ticker: 'META', verdict: 'HOLD', conf: 58 },
  { ticker: 'TSLA', verdict: 'SELL', conf: 71 },
  { ticker: 'INTC', verdict: 'SELL', conf: 79 },
];

const verdictStyle = {
  BUY:  { bg: '#EAF3DE', color: '#27500A', bar: '#3B6D11' },
  HOLD: { bg: '#FAEEDA', color: '#633806', bar: '#BA7517' },
  SELL: { bg: '#FCEBEB', color: '#791F1F', bar: '#A32D2D' },
};

export default function ActiveSignals() {
  return (
    <div className="card">
      <div className="card-title">Active signals</div>
      {SIGNALS.map(s => {
        const vs = verdictStyle[s.verdict];
        return (
          <div key={s.ticker} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '0.5px solid var(--border)', fontSize: 12 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 500, width: 44, color: 'var(--text-primary)' }}>{s.ticker}</span>
            <span style={{ fontSize: 10, fontWeight: 500, background: vs.bg, color: vs.color, padding: '2px 7px', borderRadius: 4, minWidth: 36, textAlign: 'center' }}>{s.verdict}</span>
            <div style={{ flex: 1 }}>
              <div style={{ height: 4, background: 'var(--surface-2)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${s.conf}%`, background: vs.bar, borderRadius: 3 }} />
              </div>
            </div>
            <span style={{ fontSize: 10, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', width: 32, textAlign: 'right' }}>{s.conf}%</span>
          </div>
        );
      })}
    </div>
  );
}
