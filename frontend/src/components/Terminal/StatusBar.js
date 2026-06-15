import React, { useState } from 'react';

const SHOW_SERVICES = ['news', 'inference', 'signals'];
const SERVICE_LABELS = {
  news:        'news-ingestion',
  inference:   'inference',
  signals:     'signals',
  preprocessing: 'preprocessing',
  results:     'results-db',
};

function isHealthy(svc) {
  return (svc.status || '').startsWith('running');
}

export default function StatusBar({ services = [] }) {
  const [debugOpen, setDebugOpen] = useState(false);

  const primary = SHOW_SERVICES.map(key => services.find(s => s.key === key)).filter(Boolean);

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0, left: 0, right: 0,
        zIndex: 100,
        height: 40,
        background: '#0d0d0d',
        borderTop: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        userSelect: 'none',
      }}
    >
      {/* Service dots */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        {primary.map(svc => {
          const healthy = isHealthy(svc);
          return (
            <span key={svc.key} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{
                width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                background: healthy ? '#00ff41' : '#ff3131',
                boxShadow: healthy ? '0 0 6px #00ff41' : '0 0 6px #ff3131',
              }} />
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                color: healthy ? 'var(--text-secondary)' : '#ff3131',
                letterSpacing: '0.04em',
              }}>
                {SERVICE_LABELS[svc.key] || svc.key}
              </span>
            </span>
          );
        })}
      </div>

      {/* Debug toggle */}
      <div style={{ position: 'relative' }}>
        <button
          type="button"
          onClick={() => setDebugOpen(v => !v)}
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            color: 'var(--text-dim)',
            background: 'transparent',
            border: '1px solid var(--border)',
            borderRadius: 3,
            padding: '2px 8px',
            cursor: 'pointer',
            letterSpacing: '0.06em',
          }}
        >
          debug {debugOpen ? '▲' : '▼'}
        </button>

        {debugOpen && (
          <div
            style={{
              position: 'absolute',
              bottom: 'calc(100% + 8px)',
              right: 0,
              width: 320,
              background: '#0d0d0d',
              border: '1px solid var(--border-strong)',
              borderRadius: 6,
              boxShadow: '0 0 20px rgba(0,0,0,0.7)',
              padding: '12px 0',
              zIndex: 300,
            }}
          >
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              color: 'var(--text-secondary)',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              padding: '0 14px 10px',
              borderBottom: '1px solid var(--border)',
            }}>
              Service Health
            </div>
            {services.map(svc => {
              const healthy = isHealthy(svc);
              return (
                <div
                  key={svc.key}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '8px 1fr auto',
                    alignItems: 'center',
                    gap: 8,
                    padding: '7px 14px',
                    borderBottom: '1px solid var(--border)',
                  }}
                >
                  <span style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: healthy ? '#00ff41' : '#ff3131',
                    boxShadow: healthy ? '0 0 5px #00ff41' : '0 0 5px #ff3131',
                  }} />
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-primary)' }}>
                    {svc.name || SERVICE_LABELS[svc.key] || svc.key}
                  </span>
                  <span style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 9,
                    color: healthy ? 'var(--text-secondary)' : '#ff3131',
                    letterSpacing: '0.04em',
                  }}>
                    {svc.status || 'unknown'}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
