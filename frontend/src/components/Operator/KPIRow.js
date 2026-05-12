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
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 14 }}>
      <KPI label="Articles ingested" value={articleCount.toLocaleString()} sub="+23 last 60s" />
      <KPI label="Inference throughput" value="38.4" sub="articles/sec · GPU" />
      <KPI label="Signals generated" value={signalCount.toLocaleString()} sub="BUY 41% · HOLD 38% · SELL 21%" />
      <KPI label="GPU utilization" value={`${gpuUtil}%`} sub="NVIDIA T4 · CUDA 12.3" />
    </div>
  );
}
