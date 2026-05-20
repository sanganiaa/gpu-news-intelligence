import React from 'react';

const statusStyle = {
  running: { bg: 'var(--green-bg)', color: 'var(--green-text)', dot: 'var(--green)' },
  warn:    { bg: 'var(--amber-bg)', color: 'var(--amber-text)', dot: 'var(--amber)' },
  error:   { bg: 'var(--red-bg)',   color: 'var(--red-text)',   dot: 'var(--red)'   },
};

function getStyle(status) {
  if (status.startsWith('running')) return statusStyle.running;
  if (status === 'warn') return statusStyle.warn;
  return statusStyle.error;
}

export default function ServiceHealth({ services = [], loading }) {
  return (
    <div className="card">
      <div className="card-title">Service health <span style={{ fontSize: 10 }}>{loading ? 'checking' : 'health endpoints'}</span></div>
      {services.map(svc => {
        const s = getStyle(svc.status);
        return (
          <div key={svc.name} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0', borderBottom: '0.5px solid var(--border)' }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: s.dot, flexShrink: 0, display: 'inline-block' }} />
            <span style={{ flex: 1, fontSize: 12 }}>{svc.name}</span>
            <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>:{svc.port}</span>
            <span style={{ fontSize: 10, fontWeight: 500, background: s.bg, color: s.color, padding: '2px 7px', borderRadius: 4 }}>{svc.status}</span>
          </div>
        );
      })}
      {!services.length && (
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', padding: '8px 0' }}>
          No service health responses yet.
        </div>
      )}
    </div>
  );
}
