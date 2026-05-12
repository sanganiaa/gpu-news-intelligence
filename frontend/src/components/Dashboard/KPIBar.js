import React from 'react';

const styles = {
  grid: { display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 20 },
  card: { background: 'var(--surface-2)', borderRadius: 'var(--radius-md)', padding: '14px 16px' },
  label: { fontSize: 11, fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-hint)', marginBottom: 6 },
  value: { fontSize: 22, fontWeight: 500, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' },
  change: { fontSize: 12, marginTop: 3, fontFamily: 'var(--font-mono)' },
};

export default function KPIBar({ ticker, kpis }) {
  const { price, change, changePct, volume, marketCap } = kpis;
  const isUp = parseFloat(change) >= 0;

  return (
    <div style={styles.grid}>
      <div style={styles.card}>
        <div style={styles.label}>{ticker} Price</div>
        <div style={styles.value}>${parseFloat(price).toLocaleString()}</div>
        <div style={{ ...styles.change, color: isUp ? 'var(--green)' : 'var(--red)' }}>
          {isUp ? '▲' : '▼'} {isUp ? '+' : ''}{change} ({isUp ? '+' : ''}{changePct}%)
        </div>
      </div>
      <div style={styles.card}>
        <div style={styles.label}>Volume</div>
        <div style={styles.value}>{volume}</div>
        <div style={{ ...styles.change, color: 'var(--text-hint)' }}>today</div>
      </div>
      <div style={styles.card}>
        <div style={styles.label}>Market Cap</div>
        <div style={styles.value}>{marketCap}</div>
        <div style={{ ...styles.change, color: 'var(--text-hint)' }}>approx</div>
      </div>
      <div style={styles.card}>
        <div style={styles.label}>Sources</div>
        <div style={styles.value}>3</div>
        <div style={{ ...styles.change, color: 'var(--text-hint)' }}>RSS · API · EDGAR</div>
      </div>
      <div style={styles.card}>
        <div style={styles.label}>Last ingested</div>
        <div style={{ ...styles.value, fontSize: 16 }}>Live</div>
        <div style={{ ...styles.change, color: 'var(--green)' }}>● polling 60s</div>
      </div>
    </div>
  );
}
