import React from 'react';
import StatCard from '../components/StatCard';
import GrowthChart from '../components/GrowthChart';
import PopularStocks from '../components/PopularStocks';

const Dashboard = () => {
  return (
    <>
      <div className="dashboard-grid">
        <StatCard variant="purple" title="Total Earning" value="$500.00" />
        <StatCard variant="blue" title="Total Order" value="$961" />
        <StatCard variant="simple-blue" title="Total Income" value="$203k" />
        <StatCard variant="simple-dark" title="Total Income" value="$203k" />
      </div>
      <div className="main-grid">
        <GrowthChart />
        <PopularStocks />
      </div>
    </>
  );
};

export default Dashboard;
