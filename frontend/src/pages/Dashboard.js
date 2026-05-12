import React, { useState, useEffect } from 'react';
import TopBar from '../components/Operator/TopBar';
import KPIRow from '../components/Operator/KPIRow';
import ServiceHealth from '../components/Operator/ServiceHealth';
import PipelineMetrics from '../components/Operator/PipelineMetrics';
import IngestionFeed from '../components/Operator/IngestionFeed';
import ActiveSignals from '../components/Operator/ActiveSignals';
import SystemLog from '../components/Operator/SystemLog';

export default function Dashboard() {
  const [articleCount, setArticleCount] = useState(4821);
  const [signalCount, setSignalCount]   = useState(1204);
  const [gpuUtil, setGpuUtil]           = useState(73);

  useEffect(() => {
    const id = setInterval(() => {
      setArticleCount(n => n + Math.floor(Math.random() * 3) + 1);
      setSignalCount(n  => n + Math.floor(Math.random() * 2));
      setGpuUtil(Math.floor(Math.random() * 20) + 65);
    }, 3000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="app">
      <TopBar articleCount={articleCount} signalCount={signalCount} />
      <KPIRow articleCount={articleCount} signalCount={signalCount} gpuUtil={gpuUtil} />
      <div className="grid2">
        <ServiceHealth />
        <PipelineMetrics gpuUtil={gpuUtil} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
        <IngestionFeed articleCount={articleCount} />
        <ActiveSignals />
      </div>
      <SystemLog />
    </div>
  );
}
