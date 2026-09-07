import React, { useState } from 'react';
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  PieChart, Pie, Cell, Sector,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import './pages.css';

const lineData = [
  { name: 'Jan', sales: 4000, returns: 400 },
  { name: 'Feb', sales: 3000, returns: 300 },
  { name: 'Mar', sales: 5000, returns: 500 },
  { name: 'Apr', sales: 4500, returns: 450 },
  { name: 'May', sales: 7000, returns: 700 },
  { name: 'Jun', sales: 6200, returns: 620 },
  { name: 'Jul', sales: 8100, returns: 810 },
  { name: 'Aug', sales: 7400, returns: 740 },
];

const barData = [
  { name: 'Mon', value: 120 },
  { name: 'Tue', value: 210 },
  { name: 'Wed', value: 180 },
  { name: 'Thu', value: 260 },
  { name: 'Fri', value: 330 },
  { name: 'Sat', value: 200 },
  { name: 'Sun', value: 150 },
];

const areaData = [
  { name: 'Q1', revenue: 24000, cost: 14000 },
  { name: 'Q2', revenue: 31000, cost: 18000 },
  { name: 'Q3', revenue: 28000, cost: 15000 },
  { name: 'Q4', revenue: 42000, cost: 20000 },
];

const pieData = [
  { name: 'Software', value: 42, color: '#673ab7' },
  { name: 'Hardware', value: 28, color: '#2196f3' },
  { name: 'Services', value: 18, color: '#00c853' },
  { name: 'Other', value: 12, color: '#ffc107' },
];

const RADIAN = Math.PI / 180;
const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight={600}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

const Chart = () => {
  const [dateFilter, setDateFilter] = useState('month');

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Charts</h1>
          <p className="page-subtitle">Visual analytics with multiple chart types</p>
        </div>
        <select className="select-input" value={dateFilter} onChange={e => setDateFilter(e.target.value)}>
          <option value="week">This Week</option>
          <option value="month">This Month</option>
          <option value="quarter">This Quarter</option>
          <option value="year">This Year</option>
        </select>
      </div>

      <div className="charts-2col">
        {/* Line Chart */}
        <div className="chart-card">
          <div className="chart-card-header">
            <div>
              <div className="chart-card-title">Sales vs Returns</div>
              <div className="chart-card-sub">Line chart overview</div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={lineData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ backgroundColor: 'var(--bg-card)', border: 'none', borderRadius: '8px' }} />
              <Legend />
              <Line type="monotone" dataKey="sales" stroke="#673ab7" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="returns" stroke="#2196f3" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Bar Chart */}
        <div className="chart-card">
          <div className="chart-card-header">
            <div>
              <div className="chart-card-title">Daily Orders</div>
              <div className="chart-card-sub">Bar chart — this week</div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ backgroundColor: 'var(--bg-card)', border: 'none', borderRadius: '8px' }} />
              <Bar dataKey="value" fill="#673ab7" radius={[6, 6, 0, 0]} barSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="charts-2col">
        {/* Area Chart */}
        <div className="chart-card">
          <div className="chart-card-header">
            <div>
              <div className="chart-card-title">Revenue vs Cost</div>
              <div className="chart-card-sub">Area chart — quarterly</div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={areaData}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#673ab7" stopOpacity={0.5} />
                  <stop offset="95%" stopColor="#673ab7" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="costGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2196f3" stopOpacity={0.5} />
                  <stop offset="95%" stopColor="#2196f3" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ backgroundColor: 'var(--bg-card)', border: 'none', borderRadius: '8px' }} />
              <Legend />
              <Area type="monotone" dataKey="revenue" stroke="#673ab7" strokeWidth={2} fill="url(#revGrad)" />
              <Area type="monotone" dataKey="cost" stroke="#2196f3" strokeWidth={2} fill="url(#costGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Pie / Donut Chart */}
        <div className="chart-card">
          <div className="chart-card-header">
            <div>
              <div className="chart-card-title">Revenue by Category</div>
              <div className="chart-card-sub">Donut chart breakdown</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
            <ResponsiveContainer width={200} height={220}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={90}
                  dataKey="value"
                  labelLine={false}
                  label={renderCustomLabel}
                >
                  {pieData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: 'var(--bg-card)', border: 'none', borderRadius: '8px' }} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ flex: 1 }}>
              {pieData.map(d => (
                <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: d.color, flexShrink: 0 }}></div>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '14px', flex: 1 }}>{d.name}</span>
                  <span style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: 600 }}>{d.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chart;
