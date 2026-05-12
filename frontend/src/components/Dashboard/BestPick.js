import React from 'react';

const verdictColor = { BUY: '#16a34a', HOLD: '#b45309', SELL: '#dc2626' };
const verdictBg = { BUY: '#dcfce7', HOLD: '#fef3c7', SELL: '#fee2e2' };

export default function BestPick({ ticker, verdict, confidence }) {
  const color = verdictColor[verdict] || '#888';
  const bg = verdictBg[verdict] || '#f5f5f5';

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="label">AI Verdict</div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 28, fontWeight: 500 }}>{ticker}</div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>Signal composite</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ display: 'inline-block', background: bg, color, fontFamily: 'var(--font-mono)', fontWeight: 500, fontSize: 15, padding: '6px 16px', borderRadius: 6 }}>
            {verdict}
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 500, color, marginTop: 6 }}>{confidence}%</div>
          <div style={{ fontSize: 11, color: 'var(--text-hint)' }}>confidence</div>
        </div>
      </div>
      <div>
        <div style={{ height: 6, background: 'var(--surface-2)', borderRadius: 4, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${confidence}%`, background: color, borderRadius: 4, transition: 'width 0.6s ease' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-hint)', marginTop: 4, fontFamily: 'var(--font-mono)' }}>
          <span>0%</span><span>50%</span><span>100%</span>
        </div>
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6, borderTop: '0.5px solid var(--border)', paddingTop: 12 }}>
        Based on news sentiment, signal convergence, and source credibility weighting across Yahoo Finance, NewsAPI, and SEC EDGAR filings.
      </div>
    </div>
  );
}
