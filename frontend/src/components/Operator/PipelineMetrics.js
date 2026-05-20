import React from 'react';

function Bar({ label, value, display, color }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
        <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
        <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>{display}</span>
      </div>
      <div style={{ height: 5, background: 'var(--surface-2)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${value}%`, background: color, borderRadius: 3, transition: 'width 0.5s ease' }} />
      </div>
    </div>
  );
}

export default function PipelineMetrics({ metrics }) {
  const rows = metrics?.length ? metrics : [
    { label: 'Model latency', value: 0, display: 'No metric', color: 'var(--text-hint)' },
    { label: 'Signal confidence avg', value: 0, display: 'No signals', color: 'var(--text-hint)' },
    // TODO: backend does not currently expose preprocessing queue depth.
    { label: 'Preprocessing queue', value: 0, display: 'endpoint missing', color: 'var(--amber)' },
    // TODO: backend does not currently expose DB write latency from results-db-service.
    { label: 'DB write latency', value: 0, display: 'endpoint missing', color: 'var(--amber)' },
  ];

  return (
    <div className="card">
      <div className="card-title">Pipeline metrics</div>
      {rows.map(row => <Bar key={row.label} {...row} />)}
    </div>
  );
}
