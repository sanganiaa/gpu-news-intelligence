import React from 'react';

function KPI({ label, value, sub }) {
  return (
    <div style={{ background: 'var(--surface-2)', borderRadius: 'var(--radius-md)', padding: '12px 14px' }}>
      <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 5, letterSpacing: '.04em' }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 500, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>{value}</div>
      <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2, fontFamily: 'var(--font-mono)' }}>{sub}</div>
    </div>
  );
}

export default function KPIRow({ articleCount, signalCount, gpuUtil }) {
  return (
    <div className="kpi-grid">
      <KPI label={articleCount.label || 'Current article cache'} value={articleCount.value} sub={articleCount.sub} />
      <KPI label="Inference throughput" value={gpuUtil.value} sub={gpuUtil.sub} />
      <KPI label="Signals generated" value={signalCount.value} sub={signalCount.sub} />
      <KPI label="Signal accuracy" value={signalCount.accuracy} sub={signalCount.accuracySub} />
    </div>
  );
}
