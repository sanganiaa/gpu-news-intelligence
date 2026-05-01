import React from 'react';
import KPIBar from '../components/Dashboard/KPIBar';
import SignalFeed from '../components/Signals/SignalFeed';
import NewsFeed from '../components/News/NewsFeed';
import PriceChart from '../components/Charts/PriceChart';
import BestPick from '../components/Dashboard/BestPick';

// TODO: swap mock data for React Query hooks once API gateway is wired
export default function Dashboard() {
  return (
    <div className="dashboard">
      <KPIBar />
      <div className="row-2">
        <PriceChart />
        <BestPick />
      </div>
      <div className="row-2">
        <SignalFeed />
        <NewsFeed />
      </div>
    </div>
  );
}
