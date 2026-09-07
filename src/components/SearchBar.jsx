import React, { useState, useRef } from 'react';
import { Search, Settings, X, Check } from 'lucide-react';
import { useClickOutside } from '../hooks/useClickOutside';
import './SearchBar.css';

const SearchBar = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState('All');
  const [isSearching, setIsSearching] = useState(false);
  const [noResults, setNoResults] = useState(false);
  
  const filterRef = useRef(null);
  
  useClickOutside(filterRef, () => setIsFilterOpen(false));

  const filters = ['All', 'Income', 'Orders', 'Users', 'Stocks'];

  const handleSearch = (e) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;
    
    setIsSearching(true);
    // Simulate search delay
    setTimeout(() => {
      setIsSearching(false);
      setNoResults(true); // Always show no results as it's a dummy dashboard
    }, 500);
  };

  const clearSearch = () => {
    setSearchTerm('');
    setNoResults(false);
  };

  return (
    <div className="search-bar-container">
      <form className="search-bar" onSubmit={handleSearch}>
        <Search size={18} className="search-icon" />
        
        <input 
          type="text" 
          placeholder="Search..." 
          className="search-input" 
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setNoResults(false);
          }}
        />
        
        {searchTerm && (
          <button type="button" className="clear-search-btn" onClick={clearSearch}>
            <X size={14} />
          </button>
        )}

        <div className="search-filter-wrapper" ref={filterRef}>
          <button 
            type="button" 
            className="search-filter-btn"
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            aria-label="Search filters"
          >
            <Settings size={16} />
          </button>
          
          {isFilterOpen && (
            <div className="dropdown-menu filter-dropdown">
              <div className="dropdown-header">Search In</div>
              <ul className="dropdown-list">
                {filters.map(filter => (
                  <li key={filter}>
                    <button 
                      type="button"
                      className={`dropdown-item ${activeFilter === filter ? 'active' : ''}`}
                      onClick={() => {
                        setActiveFilter(filter);
                        setIsFilterOpen(false);
                      }}
                    >
                      <span>{filter}</span>
                      {activeFilter === filter && <Check size={16} className="check-icon" />}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </form>
      
      {noResults && (
        <div className="search-results-popup">
          <p>No results found for "{searchTerm}" in {activeFilter}</p>
        </div>
      )}
    </div>
  );
};

export default SearchBar;
