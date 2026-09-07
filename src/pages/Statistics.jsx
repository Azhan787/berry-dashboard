import React, { useState } from 'react';
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { DollarSign, Users, ShoppingCart, TrendingUp, ArrowUpRight, ArrowDownRight, Calendar } from 'lucide-react';
import './pages.css';

const monthlyData = [
  { name: 'Jan', revenue: 4200, orders: 240, users: 180 },
  { name: 'Feb', revenue: 5800, orders: 310, users: 220 },
  { name: 'Mar', revenue: 4900, orders: 280, users: 195 },
  { name: 'Apr', revenue: 7200, orders: 390, users: 310 },
  { name: 'May', revenue: 6500, orders: 350, users: 275 },
  { name: 'Jun', revenue: 8100, orders: 420, users: 350 },
  { name: 'Jul', revenue: 7400, orders: 400, users: 320 },
  { name: 'Aug', revenue: 9300, orders: 480, users: 400 },
  { name: 'Sep', revenue: 8700, orders: 450, users: 380 },
  { name: 'Oct', revenue: 10200, orders: 530, users: 450 },
  { name: 'Nov', revenue: 9800, orders: 510, users: 430 },
  { name: 'Dec', revenue: 12400, orders: 640, users: 550 },
];

const kpis = [
  { label: 'Total Revenue', value: '$94,800', change: '+14.2%', up: true, icon: DollarSign, bg: 'rgba(103,58,183,0.15)', color: '#673ab7' },
  { label: 'Total Users', value: '4,062', change: '+9.8%', up: true, icon: Users, bg: 'rgba(33,150,243,0.15)', color: '#2196f3' },
  { label: 'Total Orders', value: '5,002', change: '-2.3%', up: false, icon: ShoppingCart, bg: 'rgba(0,200,83,0.15)', color: '#00c853' },
  { label: 'Growth Rate', value: '18.6%', change: '+3.1%', up: true, icon: TrendingUp, bg: 'rgba(255,193,7,0.15)', color: '#ffc107' },
];

const Statistics = () => {
  const [range, setRange] = useState('year');

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Statistics</h1>
          <p className="page-subtitle">Performance metrics and analytics overview</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Calendar size={16} color="#64748b" />
          <select className="select-input" value={range} onChange={e => setRange(e.target.value)}>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="year">This Year</option>
          </select>
        </div>
      </div>

      <div className="stats-row">
        {kpis.map(k => (
          <div className="mini-stat-card" key={k.label}>
            <div className="mini-stat-icon" style={{ backgroundColor: k.bg }}>
              <k.icon size={22} color={k.color} />
            </div>
            <div>
              <div className="mini-stat-value">{k.value}</div>
              <div className="mini-stat-label">{k.label}</div>
            </div>
            <div style={{ marginLeft: 'auto' }}>
              <span className={k.up ? 'trend-up' : 'trend-down'}>
                {k.up ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                {k.change}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="charts-2col">
        <div className="chart-card">
          <div className="chart-card-header">
            <div>
              <div className="chart-card-title">Revenue Trend</div>
              <div className="chart-card-sub">Monthly revenue performance</div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={monthlyData}>
              <defs>
                <linearGradient id="statRevGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#673ab7" stopOpacity={0.6} />
                  <stop offset="95%" stopColor="#673ab7" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ backgroundColor: 'var(--bg-card)', border: 'none', borderRadius: '8px' }} />
              <Area type="monotone" dataKey="revenue" stroke="#673ab7" strokeWidth={2} fillOpacity={1} fill="url(#statRevGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <div className="chart-card-header">
            <div>
              <div className="chart-card-title">Orders Overview</div>
              <div className="chart-card-sub">Monthly order volume</div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ backgroundColor: 'var(--bg-card)', border: 'none', borderRadius: '8px' }} />
              <Bar dataKey="orders" fill="#2196f3" radius={[4, 4, 0, 0]} barSize={18} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="chart-card">
        <div className="chart-card-header">
          <div className="chart-card-title">User Growth</div>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={monthlyData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ backgroundColor: 'var(--bg-card)', border: 'none', borderRadius: '8px' }} />
            <Line type="monotone" dataKey="users" stroke="#00c853" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default Statistics;
