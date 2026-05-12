// Mock data — replace with real API calls once backend is wired

export function getMockNews(ticker) {
  const sources = ['Yahoo Finance', 'NewsAPI', 'SEC EDGAR'];
  const sentiments = ['positive', 'negative', 'neutral'];

  const headlines = {
    NVDA: [
      { title: 'Nvidia Blackwell GPU demand surges as hyperscalers accelerate AI buildout', sentiment: 'positive', source: 'Yahoo Finance', isFilig: false },
      { title: 'NVDA 8-K: Q1 FY2026 earnings release — revenue beats by 12%', sentiment: 'positive', source: 'SEC EDGAR', isFiling: true },
      { title: 'Analyst raises NVDA price target to $1,200 on data center momentum', sentiment: 'positive', source: 'NewsAPI', isFiling: false },
    ],
    AAPL: [
      { title: 'Apple Intelligence features rolling out to EU users after regulatory approval', sentiment: 'positive', source: 'Yahoo Finance', isFiling: false },
      { title: 'iPhone 17 supply chain checks point to record pre-orders in Asia', sentiment: 'positive', source: 'NewsAPI', isFiling: false },
      { title: 'AAPL 8-K: Share repurchase program extended by $110B', sentiment: 'positive', source: 'SEC EDGAR', isFiling: true },
    ],
  };

  const defaultHeadlines = [
    { title: `${ticker} reports quarterly results ahead of analyst expectations`, sentiment: 'positive', source: 'Yahoo Finance', isFiling: false },
    { title: `${ticker} 8-K: Material definitive agreement filed`, sentiment: 'neutral', source: 'SEC EDGAR', isFiling: true },
    { title: `Analysts divided on ${ticker} outlook amid macro uncertainty`, sentiment: 'neutral', source: 'NewsAPI', isFiling: false },
    { title: `${ticker} faces headwinds as competitors ramp production`, sentiment: 'negative', source: 'NewsAPI', isFiling: false },
  ];

  const articles = headlines[ticker] || defaultHeadlines;

  return articles.map((a, i) => ({
    id: `${ticker}-${i}`,
    ticker,
    title: a.title,
    sentiment: a.sentiment,
    source: a.source,
    isFiling: a.isFiling || false,
    published_at: new Date(Date.now() - i * 3600000 * (i + 1)).toISOString(),
    url: '#',
  }));
}

export function getMockKPIs(ticker) {
  const prices = { NVDA: 924.3, AAPL: 211.4, MSFT: 420.2, META: 518.7, TSLA: 177.4, AMZN: 192.8, AMD: 161.3, SNOW: 148.2, NBIS: 34.7, PLTR: 24.8, ARM: 118.6, SMCI: 822.4 };
  const changes = { NVDA: 2.4, AAPL: -0.8, MSFT: 1.1, META: 3.2, TSLA: -1.9, AMZN: 0.6, AMD: 1.8, SNOW: -2.1, NBIS: 4.3, PLTR: 0.9, ARM: -0.4, SMCI: 5.1 };
  const price = prices[ticker] || (Math.random() * 200 + 50).toFixed(2);
  const change = changes[ticker] || (Math.random() * 6 - 3).toFixed(2);
  return { price, change, changePct: (change / price * 100).toFixed(2), volume: '24.3M', marketCap: '$2.1T' };
}

export function getMockVerdict(ticker) {
  const verdicts = { NVDA: 'BUY', AAPL: 'HOLD', MSFT: 'BUY', META: 'BUY', TSLA: 'HOLD', AMZN: 'BUY', AMD: 'BUY', SNOW: 'HOLD', NBIS: 'BUY', PLTR: 'HOLD', ARM: 'HOLD', SMCI: 'BUY' };
  const confidence = { NVDA: 87, AAPL: 61, MSFT: 74, META: 79, TSLA: 55, AMZN: 71, AMD: 68, SNOW: 58, NBIS: 82, PLTR: 63, ARM: 57, SMCI: 76 };
  return { verdict: verdicts[ticker] || 'HOLD', confidence: confidence[ticker] || Math.floor(Math.random() * 40 + 50) };
}

export function getMockChartData() {
  const labels = ['9:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30'];
  let val = 100;
  const data = labels.map(() => { val += (Math.random() - 0.48) * 2; return parseFloat(val.toFixed(2)); });
  return { labels, data };
}
