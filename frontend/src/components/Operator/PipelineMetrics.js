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

export default function PipelineMetrics({ gpuUtil }) {
  return (
    <div className="card">
      <div className="card-title">Pipeline metrics</div>
      <Bar label="GPU utilization"       value={gpuUtil} display={`${gpuUtil}%`}   color="var(--blue)" />
      <Bar label="Preprocessing queue"   value={24}      display="12 pending"       color="var(--amber)" />
      <Bar label="Dedup hit rate"        value={61}      display="61%"              color="var(--green)" />
      <Bar label="Signal confidence avg" value={74}      display="74%"              color="var(--green)" />
      <Bar label="DB write latency"      value={8}       display="4.2ms"            color="var(--green)" />
    </div>
  );
}
