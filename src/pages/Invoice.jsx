import React, { useState } from 'react';
import { Search, Plus, Eye, Pencil, Trash2, X, ChevronUp, ChevronDown } from 'lucide-react';
import './pages.css';

const initialInvoices = [
  { id: 'INV-001', customer: 'John Smith', date: '2026-09-01', amount: '$1,200.00', status: 'Paid' },
  { id: 'INV-002', customer: 'Sarah Connor', date: '2026-09-03', amount: '$850.00', status: 'Pending' },
  { id: 'INV-003', customer: 'Mike Johnson', date: '2026-09-05', amount: '$2,400.00', status: 'Paid' },
  { id: 'INV-004', customer: 'Emma Watson', date: '2026-09-06', amount: '$560.00', status: 'Overdue' },
  { id: 'INV-005', customer: 'Robert Brown', date: '2026-09-07', amount: '$1,800.00', status: 'Pending' },
  { id: 'INV-006', customer: 'Linda Davis', date: '2026-08-28', amount: '$3,200.00', status: 'Paid' },
  { id: 'INV-007', customer: 'Chris Evans', date: '2026-08-25', amount: '$720.00', status: 'Overdue' },
];

const statusBadge = (status) => {
  const map = { Paid: 'badge-success', Pending: 'badge-warning', Overdue: 'badge-error' };
  return `badge ${map[status] || 'badge-info'}`;
};

const Invoice = () => {
  const [invoices, setInvoices] = useState(initialInvoices);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState('id');
  const [sortAsc, setSortAsc] = useState(true);
  const [filterStatus, setFilterStatus] = useState('All');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ customer: '', date: '', amount: '', status: 'Paid' });
  const [page, setPage] = useState(1);
  const PER_PAGE = 5;

  const handleSort = (key) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(true); }
  };

  const filtered = invoices
    .filter(i =>
      (filterStatus === 'All' || i.status === filterStatus) &&
      (i.id.toLowerCase().includes(search.toLowerCase()) ||
        i.customer.toLowerCase().includes(search.toLowerCase()))
    )
    .sort((a, b) => {
      const va = a[sortKey] || '', vb = b[sortKey] || '';
      return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
    });

  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const totalPages = Math.ceil(filtered.length / PER_PAGE);

  const addInvoice = () => {
    const newId = `INV-${String(invoices.length + 1).padStart(3, '0')}`;
    setInvoices([{ id: newId, ...form }, ...invoices]);
    setShowModal(false);
    setForm({ customer: '', date: '', amount: '', status: 'Paid' });
  };

  const deleteInvoice = (id) => setInvoices(invoices.filter(i => i.id !== id));

  const SortIcon = ({ col }) => sortKey === col
    ? (sortAsc ? <ChevronUp size={14} /> : <ChevronDown size={14} />)
    : null;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Invoice</h1>
          <p className="page-subtitle">Manage all your invoices</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={16} /> New Invoice
        </button>
      </div>

      <div className="table-card">
        <div className="table-card-header">
          <div className="table-card-title">All Invoices ({filtered.length})</div>
          <div className="table-actions">
            <div className="search-input-wrap">
              <Search size={16} color="#64748b" />
              <input placeholder="Search invoices..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
            </div>
            <select className="select-input" value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }}>
              {['All', 'Paid', 'Pending', 'Overdue'].map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th onClick={() => handleSort('id')}>Invoice ID <SortIcon col="id" /></th>
                <th onClick={() => handleSort('customer')}>Customer <SortIcon col="customer" /></th>
                <th onClick={() => handleSort('date')}>Date <SortIcon col="date" /></th>
                <th onClick={() => handleSort('amount')}>Amount <SortIcon col="amount" /></th>
                <th onClick={() => handleSort('status')}>Status <SortIcon col="status" /></th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map(inv => (
                <tr key={inv.id}>
                  <td style={{ color: 'var(--color-primary-light)', fontWeight: 600 }}>{inv.id}</td>
                  <td style={{ color: 'var(--text-primary)' }}>{inv.customer}</td>
                  <td>{inv.date}</td>
                  <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{inv.amount}</td>
                  <td><span className={statusBadge(inv.status)}>{inv.status}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="btn btn-secondary btn-icon btn-sm" title="View"><Eye size={14} /></button>
                      <button className="btn btn-secondary btn-icon btn-sm" title="Edit"><Pencil size={14} /></button>
                      <button className="btn btn-danger btn-icon btn-sm" title="Delete" onClick={() => deleteInvoice(inv.id)}><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="pagination">
          <span className="pagination-info">Showing {Math.min((page - 1) * PER_PAGE + 1, filtered.length)}–{Math.min(page * PER_PAGE, filtered.length)} of {filtered.length}</span>
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
              <span className="modal-title">New Invoice</span>
              <button className="btn btn-secondary btn-icon" onClick={() => setShowModal(false)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">Customer Name</label>
                  <input className="form-input" value={form.customer} onChange={e => setForm({ ...form, customer: e.target.value })} placeholder="Customer name" />
                </div>
                <div className="form-group">
                  <label className="form-label">Date</label>
                  <input type="date" className="form-input" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Amount</label>
                  <input className="form-input" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="$0.00" />
                </div>
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select className="form-input" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                    {['Paid', 'Pending', 'Overdue'].map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={addInvoice}>Create Invoice</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Invoice;
