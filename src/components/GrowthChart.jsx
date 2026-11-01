import React from 'react';
import { Menu, ChevronDown } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import './GrowthChart.css';

const data = [
  { name: 'Jan', val1: 40, val2: 24, val3: 24, val4: 20 },
  { name: 'Feb', val1: 100, val2: 10, val3: 20, val4: 30 },
  { name: 'Mar', val1: 20, val2: 98, val3: 22, val4: 15 },
  { name: 'Apr', val1: 27, val2: 39, val3: 20, val4: 18 },
  { name: 'May', val1: 18, val2: 48, val3: 21, val4: 100 },
  { name: 'Jun', val1: 23, val2: 38, val3: 25, val4: 15 },
  { name: 'Jul', val1: 34, val2: 43, val3: 21, val4: 20 },
  { name: 'Aug', val1: 44, val2: 50, val3: 10, val4: 20 },
  { name: 'Sep', val1: 30, val2: 60, val3: 30, val4: 30 },
  { name: 'Oct', val1: 20, val2: 40, val3: 40, val4: 20 },
  { name: 'Nov', val1: 10, val2: 20, val3: 50, val4: 40 },
  { name: 'Dec', val1: 30, val2: 30, val3: 20, val4: 20 },
];

const GrowthChart = () => {
  return (
    <div className="card growth-chart-card">
      <div className="growth-header">
        <div>
          <p className="card-title-text">Total Growth</p>
          <h2 className="growth-value">$2,324.00</h2>
        </div>
        <button className="dropdown-btn">
          Today <ChevronDown size={16} />
        </button>
      </div>
      
      <div className="chart-actions">
        <button className="menu-btn">
          <Menu size={16} />
        </button>
      </div>

      <div className="chart-container">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 20, right: 0, left: -20, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
            <XAxis 
              dataKey="name" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: 'var(--text-muted)', fontSize: 12 }} 
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: 'var(--text-muted)', fontSize: 12 }} 
              ticks={[100, 200, 300, 400]}
            />
            <Tooltip 
              cursor={{ fill: 'rgba(255,255,255,0.05)' }}
              contentStyle={{ backgroundColor: 'var(--bg-card)', border: 'none', borderRadius: '8px' }}
            />
            <Bar dataKey="val1" stackId="a" fill="#1e88e5" radius={[0, 0, 4, 4]} barSize={12} />
            <Bar dataKey="val2" stackId="a" fill="#42a5f5" barSize={12} />
            <Bar dataKey="val3" stackId="a" fill="#7e57c2" barSize={12} />
            <Bar dataKey="val4" stackId="a" fill="#b39ddb" radius={[4, 4, 0, 0]} barSize={12} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default GrowthChart;
