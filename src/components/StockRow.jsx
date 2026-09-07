import React from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import './StockRow.css';

const StockRow = ({ name, price, percentage, isProfit }) => {
  return (
    <div className="stock-row">
      <div className="stock-info">
        <h4 className="stock-name">{name}</h4>
        <p className={`stock-percentage ${isProfit ? 'profit' : 'loss'}`}>
          {percentage} {isProfit ? 'Profit' : 'Loss'}
        </p>
      </div>
      
      <div className="stock-price-section">
        <h4 className="stock-price">{price}</h4>
        <div className={`stock-indicator ${isProfit ? 'profit-bg' : 'loss-bg'}`}>
          {isProfit ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </div>
      </div>
    </div>
  );
};

export default StockRow;
