import React, { useState, useEffect } from 'react';

function pad(n) { return n.toString().padStart(2, '0'); }

export default function TopBar({ articleCount, signalCount }) {
  const [time, setTime] = useState('');

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setTime(`${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())} ET`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 0 16px', borderBottom: '0.5px solid var(--border-strong)', marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: 'var(--green)', animation: 'pulse 2s infinite' }} />
        <span style={{ fontSize: 15, fontWeight: 500 }}>GPU News Intelligence — Operator Dashboard</span>
        <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>uptime 14h 32m</span>
      </div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>{time}</span>
        <span style={{ fontSize: 10, fontWeight: 500, background: 'var(--green-bg)', color: 'var(--green-text)', padding: '3px 10px', borderRadius: 4 }}>
          6/6 services healthy
        </span>
      </div>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}`}</style>
    </div>
  );
}
