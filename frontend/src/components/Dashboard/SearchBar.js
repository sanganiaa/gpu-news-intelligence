import React, { useState, useRef, useEffect } from 'react';

const WATCHLIST = ['NVDA', 'AAPL', 'MSFT', 'META', 'TSLA', 'AMZN', 'AMD', 'SNOW', 'NBIS', 'PLTR', 'ARM', 'SMCI'];

const styles = {
  wrap: { position: 'relative', width: '100%', maxWidth: 380 },
  input: {
    width: '100%', padding: '10px 16px 10px 40px',
    border: '0.5px solid var(--border-strong)',
    borderRadius: 'var(--radius-md)',
    background: 'var(--surface)',
    fontFamily: 'var(--font-mono)',
    fontSize: 14, fontWeight: 500,
    color: 'var(--text-primary)',
    outline: 'none',
    letterSpacing: '0.05em',
  },
  icon: { position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-hint)', fontSize: 15, pointerEvents: 'none' },
  dropdown: {
    position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0,
    background: 'var(--surface)',
    border: '0.5px solid var(--border-strong)',
    borderRadius: 'var(--radius-md)',
    zIndex: 100, overflow: 'hidden',
  },
  item: {
    padding: '9px 16px', fontFamily: 'var(--font-mono)',
    fontSize: 13, fontWeight: 500, letterSpacing: '0.05em',
    cursor: 'pointer', color: 'var(--text-primary)',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  },
  badge: { fontSize: 10, color: 'var(--text-hint)', background: 'var(--surface-2)', padding: '2px 6px', borderRadius: 4 },
};

export default function SearchBar({ value, onChange }) {
  const [query, setQuery] = useState(value || '');
  const [open, setOpen] = useState(false);
  const ref = useRef();

  const filtered = query.length >= 1
    ? WATCHLIST.filter(t => t.startsWith(query.toUpperCase()))
    : WATCHLIST;

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  function select(ticker) {
    setQuery(ticker);
    onChange(ticker);
    setOpen(false);
  }

  function handleKey(e) {
    if (e.key === 'Enter' && query.length >= 1) {
      select(query.toUpperCase());
    }
  }

  return (
    <div style={styles.wrap} ref={ref}>
      <span style={styles.icon}>⌕</span>
      <input
        style={styles.input}
        value={query}
        placeholder="Search any ticker..."
        onChange={e => { setQuery(e.target.value.toUpperCase()); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKey}
      />
      {open && filtered.length > 0 && (
        <div style={styles.dropdown}>
          {filtered.map((t, i) => (
            <div
              key={t}
              style={{ ...styles.item, background: i % 2 === 0 ? 'transparent' : 'var(--surface-2)' }}
              onMouseDown={() => select(t)}
            >
              {t}
              {WATCHLIST.includes(t) && <span style={styles.badge}>watchlist</span>}
            </div>
          ))}
          {query.length >= 2 && !WATCHLIST.includes(query) && (
            <div
              style={{ ...styles.item, color: 'var(--blue)', borderTop: '0.5px solid var(--border)' }}
              onMouseDown={() => select(query)}
            >
              Search "{query}" →
            </div>
          )}
        </div>
      )}
    </div>
  );
}
