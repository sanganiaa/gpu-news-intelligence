import React, { useEffect, useRef } from 'react';
import { getMockChartData } from '../../utils/mockData';

export default function PriceChart({ ticker }) {
  const canvasRef = useRef();
  const chartRef = useRef();

  useEffect(() => {
    if (!window.Chart) return;
    const { labels, data } = getMockChartData();
    const isUp = data[data.length - 1] >= data[0];
    const color = isUp ? '#16a34a' : '#dc2626';

    if (chartRef.current) chartRef.current.destroy();
    chartRef.current = new window.Chart(canvasRef.current, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: ticker,
          data,
          borderColor: color,
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.3,
          fill: true,
          backgroundColor: isUp ? 'rgba(22,163,74,0.06)' : 'rgba(220,38,38,0.06)',
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: { font: { family: 'DM Mono', size: 10 }, color: '#a8a49e', maxRotation: 0 } },
          y: {
            grid: { color: 'rgba(0,0,0,0.04)' },
            ticks: { font: { family: 'DM Mono', size: 10 }, color: '#a8a49e', callback: v => v.toFixed(1) }
          }
        }
      }
    });
    return () => { if (chartRef.current) chartRef.current.destroy(); };
  }, [ticker]);

  return (
    <div className="card">
      <div className="label" style={{ marginBottom: 12 }}>Intraday · {ticker}</div>
      <div style={{ position: 'relative', height: 200 }}>
        <canvas ref={canvasRef} role="img" aria-label={`${ticker} intraday price chart`} />
      </div>
    </div>
  );
}
