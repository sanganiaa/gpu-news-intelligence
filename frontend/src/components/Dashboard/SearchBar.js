import React, { useMemo, useRef, useEffect, useState } from 'react';

const TICKER_MAP = {
  NVDA:  'Nvidia',
  AAPL:  'Apple Inc.',
  MSFT:  'Microsoft',
  META:  'Meta Platforms',
  TSLA:  'Tesla',
  AMZN:  'Amazon',
  AMD:   'AMD',
  SNOW:  'Snowflake',
  PLTR:  'Palantir',
  SMCI:  'Super Micro Computer',
  INTC:  'Intel',
  QCOM:  'Qualcomm',
  ARM:   'ARM Holdings',
  AVGO:  'Broadcom',
  TSM:   'TSMC',
  ASML:  'ASML',
  ORCL:  'Oracle',
  CRM:   'Salesforce',
  ADBE:  'Adobe',
  NOW:   'ServiceNow',
  GOOGL: 'Alphabet',
  NFLX:  'Netflix',
  UBER:  'Uber',
  SPOT:  'Spotify',
  AMGN:  'Amgen',
  DIS:   'Disney',
  BABA:  'Alibaba',
  V:     'Visa',
  MA:    'Mastercard',
};

// Pre-sorted list of [ticker, name] pairs for stable ordering
const ALL_TICKERS = Object.entries(TICKER_MAP).sort(([a], [b]) => a.localeCompare(b));

const MAX_RESULTS = 8;

const styles = {
  wrap: { position: 'relative', width: '100%', maxWidth: 380 },
  input: {
    width: '100%', padding: '10px 16px 10px 40px',
    border: '0.5px solid rgba(255,255,255,0.1)',
    borderRadius: 'var(--radius-md)',
    background: 'rgba(255,255,255,0.04)',
    fontFamily: 'var(--font-mono)',
    fontSize: 14, fontWeight: 500,
    color: '#e0e0e0',
    outline: 'none',
    letterSpacing: '0.05em',
    boxSizing: 'border-box',
  },
  icon: {
    position: 'absolute', left: 14, top: '50%',
    transform: 'translateY(-50%)',
    color: '#555555', fontSize: 15, pointerEvents: 'none',
  },
  dropdown: {
    position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0,
    background: 'rgba(255,255,255,0.03)',
    backdropFilter: 'blur(20px) saturate(180%)',
    WebkitBackdropFilter: 'blur(20px) saturate(180%)',
    border: '0.5px solid rgba(255,255,255,0.1)',
    borderRadius: 'var(--radius-md)',
    zIndex: 100, overflow: 'hidden',
    boxShadow: '0 8px 32px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.04)',
  },
  item: {
    padding: '9px 16px',
    fontFamily: 'var(--font-mono)',
    fontSize: 13, fontWeight: 500,
    letterSpacing: '0.04em',
    cursor: 'pointer',
    color: '#e0e0e0',
    display: 'flex', alignItems: 'center', gap: 8,
    userSelect: 'none',
  },
  ticker: { minWidth: 48, color: '#e0e0e0' },
  sep:    { color: '#444444', fontWeight: 400 },
  name:   { color: '#666666', fontWeight: 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  searchMore: {
    padding: '9px 16px',
    fontFamily: 'var(--font-mono)',
    fontSize: 13,
    cursor: 'pointer',
    color: '#e0e0e0',
    borderTop: '0.5px solid rgba(255,255,255,0.06)',
    userSelect: 'none',
  },
};

export default function SearchBar({ value, onChange }) {
  const [query, setQuery]         = useState(value || '');
  const [open, setOpen]           = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [focused, setFocused]     = useState(false);
  const ref = useRef();

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Reset active index whenever query or open state changes
  useEffect(() => { setActiveIdx(-1); }, [query, open]);

  const filtered = useMemo(() => {
    const q = query.trim();
    if (!q) return ALL_TICKERS.slice(0, MAX_RESULTS);
    const upper = q.toUpperCase();
    const lower = q.toLowerCase();
    const matches = ALL_TICKERS.filter(([ticker, name]) =>
      ticker.startsWith(upper) || name.toLowerCase().includes(lower)
    );
    return matches.slice(0, MAX_RESULTS);
  }, [query]);

  // Whether the current query exactly matches a known ticker or company
  const isKnown = query.trim().length >= 1 && filtered.some(
    ([t]) => t === query.trim().toUpperCase()
  );

  function select(ticker) {
    setQuery(ticker);
    onChange(ticker);
    setOpen(false);
  }

  function handleChange(e) {
    setQuery(e.target.value);
    setOpen(true);
  }

  function handleKey(e) {
    if (!open) { if (e.key === 'ArrowDown') setOpen(true); return; }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx(i => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx(i => Math.max(i - 1, -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIdx >= 0 && filtered[activeIdx]) {
        select(filtered[activeIdx][0]);
      } else if (filtered.length > 0) {
        select(filtered[0][0]);
      } else if (query.trim().length >= 1) {
        select(query.trim().toUpperCase());
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  const showSearchMore = query.trim().length >= 2 && !isKnown;

  return (
    <div style={styles.wrap} ref={ref}>
      <span style={styles.icon}>⌕</span>
      <input
        style={{
          ...styles.input,
          borderColor: focused ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.1)',
        }}
        value={query}
        placeholder="Search ticker or company..."
        onChange={handleChange}
        onFocus={() => { setFocused(true); setOpen(true); }}
        onBlur={() => setFocused(false)}
        onKeyDown={handleKey}
        autoComplete="off"
        spellCheck={false}
      />
      {open && (filtered.length > 0 || showSearchMore) && (
        <div style={styles.dropdown}>
          {filtered.map(([ticker, name], i) => (
            <div
              key={ticker}
              style={{
                ...styles.item,
                background: i === activeIdx
                  ? 'rgba(255,255,255,0.08)'
                  : i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)',
              }}
              onMouseEnter={() => setActiveIdx(i)}
              onMouseLeave={() => setActiveIdx(-1)}
              onMouseDown={() => select(ticker)}
            >
              <span style={styles.ticker}>{ticker}</span>
              <span style={styles.sep}>—</span>
              <span style={styles.name}>{name}</span>
            </div>
          ))}
          {showSearchMore && (
            <div
              style={styles.searchMore}
              onMouseDown={() => select(query.trim().toUpperCase())}
            >
              Search "{query.trim().toUpperCase()}" →
            </div>
          )}
        </div>
      )}
    </div>
  );
}
