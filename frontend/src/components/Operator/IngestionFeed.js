import React, { useState, useEffect } from 'react';

const MOCK_ARTICLES = [
  { src: 'Yahoo',   srcClass: 'yahoo',   ticker: 'NVDA', title: 'Blackwell GPU demand surges as hyperscalers accelerate AI buildout',         sent: 'pos' },
  { src: 'EDGAR',   srcClass: 'edgar',   ticker: 'MSFT', title: '8-K: $60B share repurchase authorization filed with SEC',                    sent: 'pos' },
  { src: 'NewsAPI', srcClass: 'newsapi', ticker: 'TSLA', title: 'Model Y refresh faces supply delays in Berlin factory',                        sent: 'neg' },
  { src: 'Yahoo',   srcClass: 'yahoo',   ticker: 'AMD',  title: 'MI300X shipments tracking ahead of schedule per supply chain checks',         sent: 'pos' },
  { src: 'NewsAPI', srcClass: 'newsapi', ticker: 'META', title: 'FTC re-opens antitrust probe into Instagram acquisition',                     sent: 'neg' },
  { src: 'EDGAR',   srcClass: 'edgar',   ticker: 'AAPL', title: '8-K: Share repurchase program extended by $110B',                            sent: 'pos' },
  { src: 'Yahoo',   srcClass: 'yahoo',   ticker: 'PLTR', title: 'Palantir wins $480M US Army AI contract extension',                          sent: 'pos' },
  { src: 'NewsAPI', srcClass: 'newsapi', ticker: 'SNOW', title: 'Snowflake beats Q4 estimates as enterprise AI workloads accelerate',          sent: 'pos' },
  { src: 'Yahoo',   srcClass: 'yahoo',   ticker: 'NBIS', title: 'Nebius Group expands GPU cloud capacity ahead of demand surge',              sent: 'pos' },
  { src: 'EDGAR',   srcClass: 'edgar',   ticker: 'AMZN', title: '8-K: AWS announces $150B infrastructure investment plan',                    sent: 'pos' },
  { src: 'Yahoo',   srcClass: 'yahoo',   ticker: 'NVDA', title: 'Nvidia partners with sovereign AI funds across 12 countries',                sent: 'pos' },
  { src: 'NewsAPI', srcClass: 'newsapi', ticker: 'NVDA', title: 'NVDA options activity surges ahead of GTC keynote',                          sent: 'pos' },
  { src: 'EDGAR',   srcClass: 'edgar',   ticker: 'NVDA', title: '8-K: NVDA Q1 FY2026 earnings — revenue beats by 12%',                       sent: 'pos' },
];

const srcStyle = {
  yahoo:   { bg: '#E6F1FB', color: '#0C447C' },
  newsapi: { bg: '#EEEDFE', color: '#3C3489' },
  edgar:   { bg: '#FAEEDA', color: '#633806' },
};

const sentStyle = {
  pos: { bg: '#EAF3DE', color: '#27500A' },
  neg: { bg: '#FCEBEB', color: '#791F1F' },
  neu: { bg: 'var(--surface-2)', color: 'var(--text-secondary)' },
};

export default function IngestionFeed({ articleCount, ticker }) {
  const getFiltered = () => {
    const filtered = MOCK_ARTICLES.filter(a => a.ticker === ticker);
    return filtered.length > 0 ? filtered : MOCK_ARTICLES.slice(0, 3);
  };

  const [feed, setFeed] = useState(getFiltered);
  const [newCount, setNewCount] = useState(23);

  useEffect(() => {
    setFeed(getFiltered());
  }, [ticker]);

  useEffect(() => {
    const id = setInterval(() => {
      const pool = MOCK_ARTICLES.filter(a => a.ticker === ticker);
      if (pool.length > 0) {
        const next = pool[Math.floor(Math.random() * pool.length)];
        setFeed(prev => [next, ...prev.slice(0, 8)]);
      }
      setNewCount(n => n + Math.floor(Math.random() * 3) + 1);
    }, 5000);
    return () => clearInterval(id);
  }, [ticker]);

  return (
    <div className="card" style={{ gridColumn: 'span 2' }}>
      <div className="card-title">
        Live ingestion feed · <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>{ticker}</span>
        <span style={{ fontSize: 10 }}>{newCount} new · last 60s</span>
      </div>
      {feed.length === 0 ? (
        <div style={{ fontSize: 11, color: 'var(--text-secondary)', padding: '8px 0' }}>
          No articles yet for {ticker} — ingestion running...
        </div>
      ) : (
        feed.map((a, i) => {
          const ss = srcStyle[a.srcClass];
          const se = sentStyle[a.sent];
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', borderBottom: '0.5px solid var(--border)', fontSize: 11 }}>
              <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 3, fontFamily: 'var(--font-mono)', background: ss.bg, color: ss.color, flexShrink: 0 }}>{a.src}</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 500, width: 36, color: 'var(--text-primary)', flexShrink: 0 }}>{a.ticker}</span>
              <span style={{ flex: 1, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.title}</span>
              <span style={{ fontSize: 10, padding: '1px 5px', borderRadius: 3, background: se.bg, color: se.color, flexShrink: 0 }}>{a.sent}</span>
            </div>
          );
        })
      )}
    </div>
  );
}
