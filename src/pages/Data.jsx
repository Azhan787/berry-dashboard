import React, { useState } from 'react';
import { Search, Plus, Pencil, Trash2, ChevronUp, ChevronDown, X } from 'lucide-react';
import './pages.css';

const initialData = [
  { id: 1, product: 'Pro Plan Subscription', category: 'Software', region: 'North America', revenue: '$12,400', qty: 240, date: '2026-09-01' },
  { id: 2, product: 'Enterprise License', category: 'Software', region: 'Europe', revenue: '$45,000', qty: 12, date: '2026-09-02' },
  { id: 3, product: 'Consulting Services', category: 'Service', region: 'Asia', revenue: '$8,200', qty: 30, date: '2026-09-03' },
  { id: 4, product: 'Hardware Kit', category: 'Hardware', region: 'North America', revenue: '$3,100', qty: 55, date: '2026-09-04' },
  { id: 5, product: 'Training Program', category: 'Service', region: 'Europe', revenue: '$5,600', qty: 80, date: '2026-09-05' },
  { id: 6, product: 'Starter Plan', category: 'Software', region: 'Asia', revenue: '$2,800', qty: 320, date: '2026-09-06' },
  { id: 7, product: 'Support Contract', category: 'Service', region: 'North America', revenue: '$9,000', qty: 60, date: '2026-09-07' },
  { id: 8, product: 'Custom Integration', category: 'Software', region: 'Europe', revenue: '$18,500', qty: 5, date: '2026-08-30' },
];

const PER_PAGE = 5;

const Data = () => {
  const [rows, setRows] = useState(initialData);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState('id');
  const [sortAsc, setSortAsc] = useState(true);
  const [filterCat, setFilterCat] = useState('All');
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ product: '', category: 'Software', region: 'North America', revenue: '', qty: '', date: '' });

  const handleSort = (key) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(true); }
  };

  const categories = ['All', ...new Set(initialData.map(r => r.category))];

  const filtered = rows
    .filter(r =>
      (filterCat === 'All' || r.category === filterCat) &&
      r.product.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      const va = String(a[sortKey] || ''), vb = String(b[sortKey] || '');
      return sortAsc ? va.localeCompare(vb, undefined, { numeric: true }) : vb.localeCompare(va, undefined, { numeric: true });
    });

  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const totalPages = Math.ceil(filtered.length / PER_PAGE);

  const addRow = () => {
    setRows([{ id: Date.now(), ...form, qty: Number(form.qty) }, ...rows]);
    setShowModal(false);
    setForm({ product: '', category: 'Software', region: 'North America', revenue: '', qty: '', date: '' });
  };

  const deleteRow = (id) => setRows(rows.filter(r => r.id !== id));

  const SortIcon = ({ col }) => sortKey === col
    ? (sortAsc ? <ChevronUp size={13} /> : <ChevronDown size={13} />)
    : null;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Data</h1>
          <p className="page-subtitle">Browse, sort, filter and manage all your data records</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={16} /> Add Record
        </button>
      </div>

      <div className="table-card">
        <div className="table-card-header">
          <div className="table-card-title">Data Records ({filtered.length})</div>
          <div className="table-actions">
            <div className="search-input-wrap">
              <Search size={16} color="#64748b" />
              <input placeholder="Search records..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
            </div>
            <select className="select-input" value={filterCat} onChange={e => { setFilterCat(e.target.value); setPage(1); }}>
              {categories.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                {[['id', '#'], ['product', 'Product'], ['category', 'Category'], ['region', 'Region'], ['revenue', 'Revenue'], ['qty', 'Qty'], ['date', 'Date']].map(([key, label]) => (
                  <th key={key} onClick={() => handleSort(key)}>
                    {label} <SortIcon col={key} />
                  </th>
                ))}
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map(r => (
                <tr key={r.id}>
                  <td style={{ color: 'var(--text-muted)' }}>#{r.id}</td>
                  <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{r.product}</td>
                  <td><span className="badge badge-purple">{r.category}</span></td>
                  <td>{r.region}</td>
                  <td style={{ fontWeight: 600, color: 'var(--color-success)' }}>{r.revenue}</td>
                  <td>{r.qty}</td>
                  <td>{r.date}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="btn btn-secondary btn-icon btn-sm" title="Edit"><Pencil size={14} /></button>
                      <button className="btn btn-danger btn-icon btn-sm" title="Delete" onClick={() => deleteRow(r.id)}><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="pagination">
          <span className="pagination-info">
            Showing {Math.min((page - 1) * PER_PAGE + 1, filtered.length)}–{Math.min(page * PER_PAGE, filtered.length)} of {filtered.length}
          </span>
          <div className="pagination-btns">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button key={p} className={`page-btn ${p === page ? 'active' : ''}`} onClick={() => setPage(p)}>{p}</button>
            ))}
          </div>
        </div>
      </div>

      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Add Record</span>
              <button className="btn btn-secondary btn-icon" onClick={() => setShowModal(false)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Product Name</label>
                <input className="form-input" value={form.product} onChange={e => setForm({ ...form, product: e.target.value })} placeholder="Product name" />
              </div>
              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select className="form-input" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                    {['Software', 'Hardware', 'Service'].map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Region</label>
                  <select className="form-input" value={form.region} onChange={e => setForm({ ...form, region: e.target.value })}>
                    {['North America', 'Europe', 'Asia'].map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Revenue</label>
                  <input className="form-input" value={form.revenue} onChange={e => setForm({ ...form, revenue: e.target.value })} placeholder="$0.00" />
                </div>
                <div className="form-group">
                  <label className="form-label">Quantity</label>
                  <input type="number" className="form-input" value={form.qty} onChange={e => setForm({ ...form, qty: e.target.value })} placeholder="0" />
                </div>
                <div className="form-group">
                  <label className="form-label">Date</label>
                  <input type="date" className="form-input" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={addRow}>Add Record</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Data;
