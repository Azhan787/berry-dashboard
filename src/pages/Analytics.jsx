import React, { useState } from 'react';
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { TrendingUp, Users, ShoppingCart, DollarSign, Calendar, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import './pages.css';

const revenueData = [
  { month: 'Jan', revenue: 4000, users: 2400 },
  { month: 'Feb', revenue: 3000, users: 1398 },
  { month: 'Mar', revenue: 6000, users: 5800 },
  { month: 'Apr', revenue: 4800, users: 3908 },
  { month: 'May', revenue: 7000, users: 4800 },
  { month: 'Jun', revenue: 5500, users: 3800 },
  { month: 'Jul', revenue: 8000, users: 6000 },
  { month: 'Aug', revenue: 6200, users: 4300 },
  { month: 'Sep', revenue: 9100, users: 7100 },
  { month: 'Oct', revenue: 7400, users: 5200 },
  { month: 'Nov', revenue: 8800, users: 6800 },
  { month: 'Dec', revenue: 11000, users: 9000 },
];

const stats = [
  { label: 'Total Revenue', value: '$84,254', change: '+12.5%', up: true, icon: DollarSign, bg: 'rgba(103,58,183,0.15)', color: '#673ab7' },
  { label: 'Total Users', value: '56,241', change: '+8.2%', up: true, icon: Users, bg: 'rgba(33,150,243,0.15)', color: '#2196f3' },
  { label: 'Total Orders', value: '23,841', change: '-3.1%', up: false, icon: ShoppingCart, bg: 'rgba(0,200,83,0.15)', color: '#00c853' },
  { label: 'Growth Rate', value: '14.6%', change: '+2.4%', up: true, icon: TrendingUp, bg: 'rgba(255,193,7,0.15)', color: '#ffc107' },
];

const Analytics = () => {
  const [dateRange, setDateRange] = useState('year');

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Analytics</h1>
          <p className="page-subtitle">Track your key performance metrics</p>
        </div>
        <select className="select-input" value={dateRange} onChange={e => setDateRange(e.target.value)}>
          <option value="week">This Week</option>
          <option value="month">This Month</option>
          <option value="year">This Year</option>
        </select>
      </div>

      <div className="stats-row">
        {stats.map((s) => (
          <div className="mini-stat-card" key={s.label}>
            <div className="mini-stat-icon" style={{ backgroundColor: s.bg }}>
              <s.icon size={22} color={s.color} />
            </div>
            <div>
              <div className="mini-stat-value">{s.value}</div>
              <div className="mini-stat-label">{s.label}</div>
            </div>
            <div style={{ marginLeft: 'auto' }}>
              <span className={s.up ? 'trend-up' : 'trend-down'}>
                {s.up ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                {s.change}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="charts-2col">
        <div className="chart-card">
          <div className="chart-card-header">
            <div>
              <div className="chart-card-title">Revenue Overview</div>
              <div className="chart-card-sub">Monthly revenue for 2026</div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={revenueData}>
              <defs>
                <linearGradient id="anaRevGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#673ab7" stopOpacity={0.6} />
                  <stop offset="95%" stopColor="#673ab7" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ backgroundColor: 'var(--bg-card)', border: 'none', borderRadius: '8px' }} />
              <Area type="monotone" dataKey="revenue" stroke="#673ab7" strokeWidth={2} fillOpacity={1} fill="url(#anaRevGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <div className="chart-card-header">
            <div>
              <div className="chart-card-title">User Growth</div>
              <div className="chart-card-sub">Monthly active users</div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ backgroundColor: 'var(--bg-card)', border: 'none', borderRadius: '8px' }} />
              <Bar dataKey="users" fill="#2196f3" radius={[4, 4, 0, 0]} barSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="chart-card">
        <div className="chart-card-header">
          <div className="chart-card-title">Sales Statistics</div>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={revenueData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ backgroundColor: 'var(--bg-card)', border: 'none', borderRadius: '8px' }} />
            <Legend />
            <Line type="monotone" dataKey="revenue" stroke="#673ab7" strokeWidth={2} dot={false} name="Revenue" />
            <Line type="monotone" dataKey="users" stroke="#2196f3" strokeWidth={2} dot={false} name="Users" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default Analytics;
