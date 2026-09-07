import React from 'react';
import { MoreHorizontal, ArrowUpRight, ArrowDownRight, CreditCard, ShoppingBag, Store, Home } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import './StatCard.css';

const dummyChartData = [
  { value: 20 },
  { value: 40 },
  { value: 30 },
  { value: 70 },
  { value: 40 },
  { value: 80 },
  { value: 50 },
];

const StatCard = ({ variant, title, value, icon: Icon, trend }) => {
  if (variant === 'purple') {
    return (
      <div className="stat-card purple-card">
        <div className="card-bg-shape shape-1"></div>
        <div className="card-bg-shape shape-2"></div>
        
        <div className="card-header">
          <div className="icon-wrapper">
            <CreditCard size={24} color="#fff" />
          </div>
          <button className="more-btn">
            <MoreHorizontal size={20} color="#fff" />
          </button>
        </div>
        
        <div className="card-content">
          <div className="value-row">
            <h2 className="card-value">{value}</h2>
            <div className="trend-icon">
              <ArrowUpRight size={16} />
            </div>
          </div>
          <p className="card-title-text">{title}</p>
        </div>
      </div>
    );
  }

  if (variant === 'blue') {
    return (
      <div className="stat-card blue-card">
        <div className="card-bg-shape shape-3"></div>
        
        <div className="card-header">
          <div className="icon-wrapper blue-icon">
            <ShoppingBag size={24} color="#fff" />
          </div>
          <div className="toggle-group">
            <button className="toggle-btn">Month</button>
            <button className="toggle-btn active">Year</button>
          </div>
        </div>
        
        <div className="card-content blue-content">
          <div className="value-section">
            <div className="value-row">
              <h2 className="card-value">{value}</h2>
              <div className="trend-icon down">
                <ArrowDownRight size={16} />
              </div>
            </div>
            <p className="card-title-text">{title}</p>
          </div>
          <div className="mini-chart">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dummyChartData}>
                <Line type="monotone" dataKey="value" stroke="#fff" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'simple-blue') {
    return (
      <div className="stat-card simple-blue-card">
        <div className="card-bg-shape shape-4"></div>
        <div className="simple-card-content">
          <div className="simple-icon-wrapper">
            <Store size={20} color="#fff" />
          </div>
          <div>
            <h3 className="simple-value">{value}</h3>
            <p className="simple-title">{title}</p>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'simple-dark') {
    return (
      <div className="stat-card simple-dark-card">
        <div className="card-bg-shape shape-5"></div>
        <div className="simple-card-content">
          <div className="simple-icon-wrapper yellow">
            <Home size={20} color="#ffc107" />
          </div>
          <div>
            <h3 className="simple-value">{value}</h3>
            <p className="simple-title">{title}</p>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default StatCard;
