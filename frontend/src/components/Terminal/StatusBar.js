import React, { useState } from 'react';

const SHOW_SERVICES = ['news', 'inference', 'signals'];
const SERVICE_LABELS = {
  news:           'news-ingestion',
  inference:      'inference',
  signals:        'signals',
  preprocessing:  'preprocessing',
  results:        'results-db',
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
        background: '#000000',
        borderTop: '1px solid rgba(255,255,255,0.06)',
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
                color: '#555555',
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
            color: '#444444',
            background: 'transparent',
            border: '1px solid rgba(255,255,255,0.08)',
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
              background: 'rgba(255,255,255,0.02)',
              backdropFilter: 'blur(20px) saturate(180%)',
              WebkitBackdropFilter: 'blur(20px) saturate(180%)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 6,
              boxShadow: '0 8px 32px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.04)',
              padding: '12px 0',
              zIndex: 300,
            }}
          >
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              color: '#555555',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              padding: '0 14px 10px',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
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
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  <span style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: healthy ? '#00ff41' : '#ff3131',
                    boxShadow: healthy ? '0 0 5px #00ff41' : '0 0 5px #ff3131',
                  }} />
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#e0e0e0' }}>
                    {svc.name || SERVICE_LABELS[svc.key] || svc.key}
                  </span>
                  <span style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 9,
                    color: healthy ? '#555555' : '#ff3131',
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
