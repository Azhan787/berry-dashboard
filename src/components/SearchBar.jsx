import React, { useState } from 'react';
import { Search, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../lib/auth';
import './SearchBar.css';

export default function SearchBar() {
  const [searchTerm, setSearchTerm] = useState(''); const [results, setResults] = useState([]); const [message, setMessage] = useState(''); const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const handleSearch = async (event) => {
    event.preventDefault(); if (!searchTerm.trim()) return;
    setBusy(true); setMessage('');
    try { const result = await apiRequest(`/customers?limit=5&search=${encodeURIComponent(searchTerm.trim())}`); setResults(result.items || []); setMessage(result.items?.length ? '' : 'No matching customers.'); }
    catch (error) { setResults([]); setMessage(error.message); }
    finally { setBusy(false); }
  };
  const clearSearch = () => { setSearchTerm(''); setResults([]); setMessage(''); };
  return <div className="search-bar-container"><form className="search-bar" onSubmit={handleSearch}>
    <Search size={18} className="search-icon" /><input type="search" placeholder="Search customers..." aria-label="Search customers" className="search-input" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} />
    {searchTerm && <button type="button" className="clear-search-btn" onClick={clearSearch} aria-label="Clear search"><X size={14} /></button>}
    <button type="submit" className="search-filter-btn" aria-label="Run search" disabled={busy}>{busy ? '…' : <Search size={16} />}</button>
  </form>
  {(results.length > 0 || message) && <div className="search-results-popup" role="status">{message || results.map((customer) => <button key={customer.id} type="button" className="search-result-item" onClick={() => { navigate('/customers'); clearSearch(); }}><strong>{customer.name}</strong><small>{customer.email || customer.company_name || 'Customer'}</small></button>)}</div>}
  </div>;
}
