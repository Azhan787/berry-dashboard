import React, { useState } from 'react';
import { Search, Plus, Pencil, Trash2, X, Users, DollarSign, ShoppingBag, Star } from 'lucide-react';
import './pages.css';

const custStats = [
  { label: 'Total Customers', value: '5,241', icon: Users, bg: 'rgba(103,58,183,0.15)', color: '#673ab7' },
  { label: 'Total Revenue', value: '$284k', icon: DollarSign, bg: 'rgba(0,200,83,0.15)', color: '#00c853' },
  { label: 'Total Orders', value: '18,420', icon: ShoppingBag, bg: 'rgba(33,150,243,0.15)', color: '#2196f3' },
  { label: 'VIP Customers', value: '312', icon: Star, bg: 'rgba(255,193,7,0.15)', color: '#ffc107' },
];

const avatarColors = ['#673ab7', '#2196f3', '#00c853', '#ffc107', '#f44336', '#e91e63', '#00bcd4'];

const initialCustomers = [
  { id: 1, name: 'John Smith', email: 'john@example.com', phone: '+1 555-1001', orders: 24, spent: '$4,820', status: 'Active' },
  { id: 2, name: 'Sarah Connor', email: 'sarah@example.com', phone: '+1 555-1002', orders: 8, spent: '$1,240', status: 'Active' },
  { id: 3, name: 'Mike Johnson', email: 'mike@example.com', phone: '+1 555-1003', orders: 51, spent: '$12,400', status: 'VIP' },
  { id: 4, name: 'Emma Watson', email: 'emma@example.com', phone: '+1 555-1004', orders: 3, spent: '$380', status: 'Inactive' },
  { id: 5, name: 'Robert Brown', email: 'robert@example.com', phone: '+1 555-1005', orders: 16, spent: '$3,100', status: 'Active' },
  { id: 6, name: 'Linda Davis', email: 'linda@example.com', phone: '+1 555-1006', orders: 72, spent: '$22,000', status: 'VIP' },
  { id: 7, name: 'Chris Evans', email: 'chris@example.com', phone: '+1 555-1007', orders: 5, spent: '$920', status: 'Active' },
];

const statusBadge = (s) => {
  const map = { Active: 'badge-success', Inactive: 'badge-error', VIP: 'badge-warning' };
  return `badge ${map[s] || 'badge-info'}`;
};

const PER_PAGE = 5;

const Customers = () => {
  const [customers, setCustomers] = useState(initialCustomers);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [showModal, setShowModal] = useState(false);
  const [page, setPage] = useState(1);
  const [form, setForm] = useState({ name: '', email: '', phone: '', orders: 0, spent: '$0', status: 'Active' });

  const filtered = customers.filter(c =>
    (filterStatus === 'All' || c.status === filterStatus) &&
    (c.name.toLowerCase().includes(search.toLowerCase()) || c.email.toLowerCase().includes(search.toLowerCase()))
  );

  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const totalPages = Math.ceil(filtered.length / PER_PAGE);

  const addCustomer = () => {
    setCustomers([{ id: Date.now(), ...form, orders: Number(form.orders) }, ...customers]);
    setShowModal(false);
    setForm({ name: '', email: '', phone: '', orders: 0, spent: '$0', status: 'Active' });
  };

  const deleteCustomer = (id) => setCustomers(customers.filter(c => c.id !== id));

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Customers</h1>
          <p className="page-subtitle">Manage your customer base and purchase history</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={16} /> Add Customer
        </button>
      </div>

      <div className="stats-row">
        {custStats.map(s => (
          <div className="mini-stat-card" key={s.label}>
            <div className="mini-stat-icon" style={{ backgroundColor: s.bg }}>
              <s.icon size={22} color={s.color} />
            </div>
            <div>
              <div className="mini-stat-value">{s.value}</div>
              <div className="mini-stat-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="table-card">
        <div className="table-card-header">
          <div className="table-card-title">Customer List ({filtered.length})</div>
          <div className="table-actions">
            <div className="search-input-wrap">
              <Search size={16} color="#64748b" />
              <input placeholder="Search customers..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
            </div>
            <select className="select-input" value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }}>
              {['All', 'Active', 'Inactive', 'VIP'].map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Orders</th>
                <th>Total Spent</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((c, i) => (
                <tr key={c.id}>
                  <td>
                    <div className="user-cell">
                      <div className="avatar-sm" style={{ backgroundColor: avatarColors[i % avatarColors.length] }}>
                        {c.name.charAt(0)}
                      </div>
                      <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{c.name}</span>
                    </div>
                  </td>
                  <td>{c.email}</td>
                  <td>{c.phone}</td>
                  <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{c.orders}</td>
                  <td style={{ fontWeight: 600, color: 'var(--color-success)' }}>{c.spent}</td>
                  <td><span className={statusBadge(c.status)}>{c.status}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="btn btn-secondary btn-icon btn-sm" title="Edit"><Pencil size={14} /></button>
                      <button className="btn btn-danger btn-icon btn-sm" title="Delete" onClick={() => deleteCustomer(c.id)}><Trash2 size={14} /></button>
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
              <span className="modal-title">Add Customer</span>
              <button className="btn btn-secondary btn-icon" onClick={() => setShowModal(false)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Full name" />
                </div>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input type="email" className="form-input" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="email@example.com" />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input className="form-input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+1 555-0000" />
                </div>
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select className="form-input" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                    {['Active', 'Inactive', 'VIP'].map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={addCustomer}>Add Customer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Customers;
