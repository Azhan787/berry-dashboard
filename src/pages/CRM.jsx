import React, { useState } from 'react';
import { Search, Plus, X, Users, TrendingUp, Handshake, BarChart2 } from 'lucide-react';
import './pages.css';

const crmStats = [
  { label: 'Total Customers', value: '8,249', icon: Users, bg: 'rgba(103,58,183,0.15)', color: '#673ab7' },
  { label: 'Active Leads', value: '1,423', icon: TrendingUp, bg: 'rgba(33,150,243,0.15)', color: '#2196f3' },
  { label: 'Deals Closed', value: '342', icon: Handshake, bg: 'rgba(0,200,83,0.15)', color: '#00c853' },
  { label: 'Conversion Rate', value: '24%', icon: BarChart2, bg: 'rgba(255,193,7,0.15)', color: '#ffc107' },
];

const initialCustomers = [
  { id: 1, name: 'Alice Martin', email: 'alice@example.com', phone: '+1 555-0101', company: 'TechCorp', status: 'Active', lead: 'Hot' },
  { id: 2, name: 'Bob Lee', email: 'bob@example.com', phone: '+1 555-0102', company: 'Finex Ltd', status: 'Inactive', lead: 'Warm' },
  { id: 3, name: 'Carol White', email: 'carol@example.com', phone: '+1 555-0103', company: 'Mediaworks', status: 'Active', lead: 'Cold' },
  { id: 4, name: 'David Kim', email: 'david@example.com', phone: '+1 555-0104', company: 'InnoTech', status: 'Active', lead: 'Hot' },
  { id: 5, name: 'Eve Turner', email: 'eve@example.com', phone: '+1 555-0105', company: 'Retail Plus', status: 'Prospect', lead: 'Warm' },
];

const avatarColors = ['#673ab7', '#2196f3', '#00c853', '#ffc107', '#f44336'];

const CRM = () => {
  const [customers, setCustomers] = useState(initialCustomers);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', company: '', status: 'Active', lead: 'Warm' });

  const filtered = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.company.toLowerCase().includes(search.toLowerCase())
  );

  const addCustomer = () => {
    setCustomers([{ id: Date.now(), ...form }, ...customers]);
    setShowModal(false);
    setForm({ name: '', email: '', phone: '', company: '', status: 'Active', lead: 'Warm' });
  };

  const deleteCustomer = (id) => setCustomers(customers.filter(c => c.id !== id));

  const leadBadge = (lead) => {
    const map = { Hot: 'badge-error', Warm: 'badge-warning', Cold: 'badge-info' };
    return `badge ${map[lead] || 'badge-info'}`;
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">CRM</h1>
          <p className="page-subtitle">Customer Relationship Management</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={16} /> Add Customer
        </button>
      </div>

      <div className="stats-row">
        {crmStats.map(s => (
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
          <div className="table-card-title">Customer List</div>
          <div className="table-actions">
            <div className="search-input-wrap">
              <Search size={16} color="#64748b" />
              <input placeholder="Search customers..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Company</th>
                <th>Lead</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c, i) => (
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
                  <td>{c.company}</td>
                  <td><span className={leadBadge(c.lead)}>{c.lead}</span></td>
                  <td><span className={`badge ${c.status === 'Active' ? 'badge-success' : c.status === 'Inactive' ? 'badge-error' : 'badge-warning'}`}>{c.status}</span></td>
                  <td>
                    <button className="btn btn-danger btn-icon btn-sm" onClick={() => deleteCustomer(c.id)} title="Delete">✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
                {[['name', 'Full Name'], ['email', 'Email'], ['phone', 'Phone'], ['company', 'Company']].map(([k, lbl]) => (
                  <div className="form-group" key={k}>
                    <label className="form-label">{lbl}</label>
                    <input className="form-input" value={form[k]} onChange={e => setForm({ ...form, [k]: e.target.value })} placeholder={lbl} />
                  </div>
                ))}
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select className="form-input" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                    {['Active', 'Inactive', 'Prospect'].map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Lead Temperature</label>
                  <select className="form-input" value={form.lead} onChange={e => setForm({ ...form, lead: e.target.value })}>
                    {['Hot', 'Warm', 'Cold'].map(s => <option key={s}>{s}</option>)}
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

export default CRM;
