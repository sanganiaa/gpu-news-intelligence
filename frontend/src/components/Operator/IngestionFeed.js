import React, { useMemo } from 'react';

function stripHtml(value) {
  if (!value) return '';
  return String(value)
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractHref(html) {
  if (!html) return null;
  const match = String(html).match(/href=["']([^"']+)["']/i);
  return match ? match[1] : null;
}

function truncate(text, max = 80) {
  if (!text) return '';
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

function formatRefreshed(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

const srcStyle = {
  yahoo:   { bg: '#E6F1FB', color: '#0C447C' },
  newsapi: { bg: '#EEEDFE', color: '#3C3489' },
  edgar:   { bg: '#FFF3E6', color: '#8A4000' },
  reddit:  { bg: '#FFEBEE', color: '#C62828' },
  fred:    { bg: '#F3E5F5', color: '#6A1B9A' },
};

const sentStyle = {
  positive: { bg: '#EAF3DE', color: '#27500A', border: 'var(--green)' },
  negative: { bg: '#FCEBEB', color: '#791F1F', border: 'var(--red)' },
  neutral:  { bg: 'var(--surface-2)', color: 'var(--text-secondary)', border: '#9C9890' },
};

function sourceClass(source = '') {
  const s = source.toLowerCase();
  if (s.includes('edgar') || s.includes('sec')) return 'edgar';
  if (s.includes('newsapi')) return 'newsapi';
  if (s.includes('reddit')) return 'reddit';
  if (s.includes('fred') || s.includes('macro')) return 'fred';
  return 'yahoo';
}

function sourceLabel(source = '') {
  const s = source.toLowerCase();
  if (s.includes('edgar') || s.includes('sec')) return 'SEC EDGAR';
  if (s.includes('newsapi')) return 'NewsAPI';
  if (s.includes('yahoo')) return 'Yahoo';
  if (s.includes('reddit')) return 'Reddit';
  if (s.includes('fred') || s.includes('macro')) return 'Macro';
  return source || 'source';
}

function normalizeSentiment(article) {
  if (article.sentiment === 'positive' || article.sentiment === 'negative' || article.sentiment === 'neutral') {
    return article.sentiment;
  }
  const positive = Number(article.positive || 0);
  const negative = Number(article.negative || 0);
  const neutral = Number(article.neutral || 0);
  if (positive || negative || neutral) {
    if (positive >= negative && positive >= neutral) return 'positive';
    if (negative >= neutral) return 'negative';
    return 'neutral';
  }
  return 'neutral';
}

function pct(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.round(Math.max(0, Math.min(n, 1)) * 100);
}

function formatTime(value) {
  if (!value) return 'time n/a';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'time n/a';
  return date.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function implicationTone(value = '', sentiment) {
  const lower = value.toLowerCase();
  if (lower.startsWith('bullish')) return 'positive';
  if (lower.startsWith('bearish')) return 'negative';
  if (lower.startsWith('neutral')) return 'neutral';
  return sentiment;
}

function isSecFiling(article = {}) {
  if (article.content_type === 'sec_filing') return true;
  if (article.is_filing || article.filing_type) return true;
  const source = String(article.source || '').toLowerCase();
  const title = String(article.title || '').toLowerCase();
  return (
    source.includes('edgar') || source.includes('sec') ||
    /\bsec\b/.test(title) || /\b8-k\b/.test(title) || /\b10-k\b/.test(title) || /\b10-q\b/.test(title) ||
    title.includes('form 8-k') || title.includes('form 10-k') || title.includes('form 10-q')
  );
}

function articleTickers(article = {}) {
  if (Array.isArray(article.tickers)) return article.tickers.map(t => String(t).toUpperCase());
  if (article.ticker) return [String(article.ticker).toUpperCase()];
  return [];
}

function matchesTicker(article, ticker) {
  if (!ticker) return true;
  return articleTickers(article).includes(String(ticker).toUpperCase());
}

function isNewsArticle(article = {}) {
  if (article.content_type) return article.content_type === 'news';
  return !isSecFiling(article);
}

function SentimentBar({ article }) {
  const hasData = ['positive', 'negative', 'neutral'].some(
    k => article[k] !== undefined && article[k] !== null && Number(article[k]) > 0,
  );
  if (!hasData) return null;

  const values = {
    positive: pct(article.positive),
    negative: pct(article.negative),
    neutral: pct(article.neutral),
  };
  if (values.positive === 0 && values.negative === 0 && values.neutral === 0) return null;

  return (
    <div>
      <div style={{ display: 'flex', height: 6, overflow: 'hidden', borderRadius: 4, background: 'var(--surface-2)' }}>
        <div style={{ width: `${values.positive}%`, background: 'var(--green)' }} />
        <div style={{ width: `${values.negative}%`, background: 'var(--red)' }} />
        <div style={{ width: `${values.neutral}%`, background: '#9C9890' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 5, fontSize: 10, color: 'var(--text-hint)', fontFamily: 'var(--font-mono)' }}>
        <span>pos {values.positive}%</span>
        <span>neg {values.negative}%</span>
        <span>neu {values.neutral}%</span>
      </div>
    </div>
  );
}

export default function IngestionFeed({ articles = [], ticker, loading, error, onTickerClick, lastRefreshed }) {
  const feedStats = useMemo(() => {
    const selectedArticles = articles
      .filter(article => matchesTicker(article, ticker))
      .sort((a, b) => new Date(b.published_at || b.ingested_at) - new Date(a.published_at || a.ingested_at));
    const secFilings = selectedArticles.filter(isSecFiling);
    const newsArticles = selectedArticles.filter(isNewsArticle);
    return { selectedArticles, secFilings, newsArticles };
  }, [articles, ticker]);

  const { selectedArticles, secFilings, newsArticles } = feedStats;
  const showDebugCounts = process.env.NODE_ENV === 'development';

  return (
    <div className="card" style={{ gridColumn: 'span 2' }}>
      <div className="card-title">
        Live ingestion feed · <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>{ticker}</span>
        <span style={{ fontSize: 10 }}>{loading ? 'loading' : `${newsArticles.length} news`}</span>
      </div>
      {lastRefreshed && (
        <div style={{ fontSize: 10, color: 'var(--text-hint)', margin: '-8px 0 10px', fontFamily: 'var(--font-mono)' }}>
          Last refreshed {formatRefreshed(lastRefreshed)}
        </div>
      )}
      {showDebugCounts && (
        <div style={{ fontSize: 10, color: 'var(--text-hint)', fontFamily: 'var(--font-mono)', margin: '-4px 0 10px' }}>
          total {articles.length} · selected {selectedArticles.length} · news {newsArticles.length} · sec {secFilings.length}
        </div>
      )}
      {error && (
        <div style={{ fontSize: 11, color: 'var(--red-text)', padding: '0 0 8px' }}>
          News service unavailable: {error.message}
        </div>
      )}
      {!loading && newsArticles.length === 0 ? (
        <div style={{ fontSize: 11, color: 'var(--text-secondary)', padding: '8px 0' }}>
          No news articles available for {ticker}. Signals may still be using filings, macro items, or cached results.
        </div>
      ) : (
        newsArticles.map(a => {
          const ss = srcStyle[sourceClass(a.source)] || srcStyle.yahoo;
          const sentiment = normalizeSentiment(a);
          const borderColor = sentStyle[sentiment]?.border || sentStyle.neutral.border;
          const implication = a.investment_implication || null;
          const implicationStyle = implication
            ? (sentStyle[implicationTone(implication, sentiment)] || sentStyle.neutral)
            : null;

          const rawTitle = a.title || '';
          const href = extractHref(rawTitle) || a.url || null;
          const displayTitle = truncate(stripHtml(rawTitle));
          const summaryText = stripHtml(a.summary_ai || a.summary || '');

          return (
            <div
              key={a.id}
              style={{
                border: `1px solid ${borderColor}`,
                borderLeft: `4px solid ${borderColor}`,
                borderRadius: 8,
                padding: 10,
                marginBottom: 10,
                background: 'var(--surface)',
                minWidth: 0,
                maxWidth: '100%',
                overflow: 'hidden',
                overflowWrap: 'anywhere',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7, minWidth: 0 }}>
                <button
                  type="button"
                  onClick={() => onTickerClick?.(a.ticker || articleTickers(a)[0])}
                  style={{
                    fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: 11,
                    color: 'var(--text-primary)', background: 'var(--surface-2)',
                    border: '0.5px solid var(--border-strong)', borderRadius: 4,
                    padding: '2px 6px', cursor: onTickerClick ? 'pointer' : 'default', flexShrink: 0,
                  }}
                >
                  {a.ticker || articleTickers(a)[0] || ticker}
                </button>
                <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, fontFamily: 'var(--font-mono)', background: ss.bg, color: ss.color, flexShrink: 0 }}>
                  {sourceLabel(a.source)}
                </span>
                <span style={{ fontSize: 10, color: 'var(--text-hint)', fontFamily: 'var(--font-mono)', marginLeft: 'auto', flexShrink: 0 }}>
                  {formatTime(a.published_at || a.ingested_at)}
                </span>
              </div>

              <div style={{ fontSize: 13, lineHeight: 1.35, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
                {href ? (
                  <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>
                    {displayTitle}
                  </a>
                ) : displayTitle}
              </div>

              {summaryText && (
                <div style={{ fontSize: 12, lineHeight: 1.45, color: 'var(--text-secondary)', marginBottom: 9 }}>
                  {summaryText}
                </div>
              )}

              {(implication || a.catalyst_tag) && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 9 }}>
                  {implication && implicationStyle && (
                    <span style={{ fontSize: 10, lineHeight: 1.4, padding: '2px 7px', borderRadius: 4, background: implicationStyle.bg, color: implicationStyle.color }}>
                      {implication}
                    </span>
                  )}
                  {a.catalyst_tag && (
                    <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 4, background: 'var(--blue-bg)', color: 'var(--blue-text)', fontFamily: 'var(--font-mono)' }}>
                      {a.catalyst_tag}
                    </span>
                  )}
                </div>
              )}

              <SentimentBar article={a} />
            </div>
          );
        })
      )}
    </div>
  );
}
