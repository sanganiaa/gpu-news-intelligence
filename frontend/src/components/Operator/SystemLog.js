import React from 'react';

function pad(n) { return n.toString().padStart(2, '0'); }

const clsColor = { ok: '#3B6D11', warn: '#BA7517', info: '#185FA5', err: '#A32D2D' };

function timestamp(value) {
  if (!value) return '';
  const date = new Date(value);
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

export default function SystemLog({ logs = [] }) {
  return (
    <div className="card" style={{ marginBottom: 0 }}>
      <div className="card-title">
        System log
        <span style={{ fontSize: 10 }}>latest backend responses</span>
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, lineHeight: 1.7 }}>
        {logs.length === 0 && (
          <div style={{ padding: '2px 0', color: 'var(--text-secondary)' }}>Waiting for backend responses...</div>
        )}
        {logs.map(l => (
          <div key={l.id} style={{ padding: '2px 0', borderBottom: '0.5px solid var(--border)' }}>
            <span style={{ color: 'var(--text-hint)', marginRight: 8 }}>{timestamp(l.ts)}</span>
            <span style={{ color: clsColor[l.cls], marginRight: 6 }}>{l.svc}</span>
            <span style={{ color: 'var(--text-secondary)' }}>{l.msg}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
