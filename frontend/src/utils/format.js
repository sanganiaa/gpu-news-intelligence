export const formatPrice = v => v?.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
export const formatPct = v => (v >= 0 ? '+' : '') + v?.toFixed(2) + '%';
export const formatConfidence = v => (v * 100).toFixed(0) + '%';
