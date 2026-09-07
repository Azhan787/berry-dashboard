import React from 'react';
import { MoreHorizontal } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import StockRow from './StockRow';
import './PopularStocks.css';

const sparklineData = [
  { val: 10 },
  { val: 15 },
  { val: 25 },
  { val: 18 },
  { val: 40 },
  { val: 20 },
  { val: 25 },
  { val: 35 },
];

const PopularStocks = () => {
  return (
    <div className="card popular-stocks-card">
      <div className="stocks-header">
        <h3 className="card-title-text" style={{ fontSize: '16px', color: '#fff' }}>Popular Stocks</h3>
        <button className="more-btn">
          <MoreHorizontal size={20} color="#8492c4" />
        </button>
      </div>

      <div className="featured-stock">
        <div className="featured-info">
          <div>
            <h4 className="featured-name">Bajaj Finery</h4>
            <p className="featured-percentage">10% Profit</p>
          </div>
          <h3 className="featured-price">$1839.00</h3>
        </div>
        
        <div className="featured-chart">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sparklineData}>
              <defs>
                <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#673ab7" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#673ab7" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <Area 
                type="monotone" 
                dataKey="val" 
                stroke="#673ab7" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#colorVal)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="stocks-list">
        <StockRow name="Bajaj Finserv" price="$1839.00" percentage="10%" isProfit={true} />
        <StockRow name="TTML" price="$100.00" percentage="10%" isProfit={false} />
        <StockRow name="Reliance" price="$200.00" percentage="10%" isProfit={true} />
        <StockRow name="TTML" price="$189.00" percentage="10%" isProfit={false} />
      </div>
      
      <div className="view-all-container">
        <button className="view-all-btn">View All</button>
      </div>
    </div>
  );
};

export default PopularStocks;
