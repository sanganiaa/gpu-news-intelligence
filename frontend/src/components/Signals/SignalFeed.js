import React from 'react';

const signals = [
  { name: 'Sentiment Score', value: 0.74, unit: '', positive: true },
  { name: 'News Volume', value: 23, unit: ' articles', positive: true },
  { name: 'Filing Activity', value: 2, unit: ' 8-Ks', positive: null },
  { name: 'Source Diversity', value: 3, unit: '/3 sources', positive: true },
];

function SignalRow({ signal }) {
  const pct = Math.min(Math.abs(signal.value) * (signal.unit === '' ? 100 : 4), 100);
  const color = signal.positive === true ? 'var(--green)' : signal.positive === false ? 'var(--red)' : 'var(--text-hint)';
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{signal.name}</span>
        <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', fontWeight: 500, color }}>{signal.value}{signal.unit}</span>
      </div>
      <div style={{ height: 4, background: 'var(--surface-2)', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 4 }} />
      </div>
    </div>
  );
}

export default function SignalFeed({ ticker, articles }) {
  const posCount = articles.filter(a => a.sentiment === 'positive').length;
  const negCount = articles.filter(a => a.sentiment === 'negative').length;
  const total = articles.length || 1;
  const score = ((posCount - negCount) / total * 0.5 + 0.5).toFixed(2);
  const filings = articles.filter(a => a.isFiling).length;

  const dynamicSignals = [
    { name: 'Sentiment Score', value: parseFloat(score), unit: '', positive: score > 0.5 ? true : false },
    { name: 'News Volume', value: articles.length, unit: ' articles', positive: articles.length > 5 },
    { name: 'Filing Activity', value: filings, unit: ' 8-Ks', positive: null },
    { name: 'Source Diversity', value: new Set(articles.map(a => a.source)).size, unit: '/3 sources', positive: true },
  ];

  return (
    <div className="card">
      <div className="label" style={{ marginBottom: 16 }}>Signal Summary · {ticker}</div>
      {dynamicSignals.map(s => <SignalRow key={s.name} signal={s} />)}
    </div>
  );
}
