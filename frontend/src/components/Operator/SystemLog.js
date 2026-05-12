import React, { useState, useEffect, useRef } from 'react';

function pad(n) { return n.toString().padStart(2, '0'); }

const INITIAL_LOGS = [
  { cls: 'ok',   svc: '[ingestion]',   msg: 'Yahoo RSS cycle complete — NVDA: 3 new, MSFT: 2 new, AMD: 4 new' },
  { cls: 'info', svc: '[inference]',   msg: 'Batch processed 18 articles in 0.47s — GPU mem 2.1GB/16GB' },
  { cls: 'ok',   svc: '[signal]',      msg: 'PLTR verdict updated: HOLD → BUY (conf 0.81, 3 positive articles)' },
  { cls: 'ok',   svc: '[edgar]',       msg: 'AAPL 8-K ingested — accession 0000320193-24-000123' },
  { cls: 'warn', svc: '[preprocessing]', msg: 'Queue depth 12 — processing backlog within threshold' },
  { cls: 'info', svc: '[db]',          msg: '47 signals flushed to results-db — write latency 4.2ms' },
  { cls: 'ok',   svc: '[ingestion]',   msg: 'NewsAPI cycle complete — 8 new articles across 6 tickers' },
  { cls: 'info', svc: '[inference]',   msg: 'Model warm — FinBERT loaded on MPS device, ready' },
];

const ROLLING_LOGS = [
  { cls: 'ok',   svc: '[ingestion]',    msg: 'NewsAPI cycle — TSLA: 2 new, META: 1 new (dedup: 3 skipped)' },
  { cls: 'info', svc: '[inference]',    msg: 'Batch 22 articles processed in 0.52s — throughput 42.3/s' },
  { cls: 'ok',   svc: '[signal]',       msg: 'NVDA verdict confirmed BUY (conf 0.87, 5 pos / 0 neg)' },
  { cls: 'warn', svc: '[preprocessing]', msg: 'Entity extraction slow on article #4821 — 210ms' },
  { cls: 'ok',   svc: '[edgar]',        msg: 'MSFT 8-K ingested — accession 0000789019-24-000088' },
  { cls: 'info', svc: '[db]',           msg: 'Backtesting job queued — 7-day signal accuracy run' },
  { cls: 'ok',   svc: '[ingestion]',    msg: 'Yahoo RSS cycle — AMD: 4 new, PLTR: 2 new' },
  { cls: 'info', svc: '[inference]',    msg: 'GPU memory stable at 2.1GB / 16GB (13%)' },
];

const clsColor = { ok: '#3B6D11', warn: '#BA7517', info: '#185FA5', err: '#A32D2D' };

export default function SystemLog() {
  const [logs, setLogs] = useState(INITIAL_LOGS.map((l, i) => ({ ...l, ts: '', id: i })));
  const rollingIdx = useRef(0);
  const idRef = useRef(100);

  useEffect(() => {
    const id = setInterval(() => {
      const now = new Date();
      const ts = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
      const entry = ROLLING_LOGS[rollingIdx.current % ROLLING_LOGS.length];
      rollingIdx.current++;
      setLogs(prev => [{ ...entry, ts, id: idRef.current++ }, ...prev.slice(0, 11)]);
    }, 4000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="card" style={{ marginBottom: 0 }}>
      <div className="card-title">
        System log
        <span style={{ fontSize: 10 }}>live · last 60s</span>
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, lineHeight: 1.7 }}>
        {logs.map(l => (
          <div key={l.id} style={{ padding: '2px 0', borderBottom: '0.5px solid var(--border)' }}>
            <span style={{ color: 'var(--text-hint)', marginRight: 8 }}>{l.ts}</span>
            <span style={{ color: clsColor[l.cls], marginRight: 6 }}>{l.svc}</span>
            <span style={{ color: 'var(--text-secondary)' }}>{l.msg}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
