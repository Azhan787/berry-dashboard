import React, { useState } from 'react';
import { Search, Plus, Pencil, Trash2, X, Users as UsersIcon, UserCheck, UserX, Shield } from 'lucide-react';
import './pages.css';

const userStats = [
  { label: 'Total Users', value: '12,489', icon: UsersIcon, bg: 'rgba(103,58,183,0.15)', color: '#673ab7' },
  { label: 'Active Users', value: '9,821', icon: UserCheck, bg: 'rgba(0,200,83,0.15)', color: '#00c853' },
  { label: 'Inactive Users', value: '2,668', icon: UserX, bg: 'rgba(244,67,54,0.15)', color: '#f44336' },
  { label: 'Admins', value: '34', icon: Shield, bg: 'rgba(255,193,7,0.15)', color: '#ffc107' },
];

const avatarColors = ['#673ab7', '#2196f3', '#00c853', '#ffc107', '#f44336', '#e91e63', '#00bcd4'];

const initialUsers = [
  { id: 1, name: 'Alice Martin', email: 'alice@example.com', role: 'Admin', status: 'Active', joined: '2024-01-15' },
  { id: 2, name: 'Bob Lee', email: 'bob@example.com', role: 'User', status: 'Active', joined: '2024-03-22' },
  { id: 3, name: 'Carol White', email: 'carol@example.com', role: 'Editor', status: 'Inactive', joined: '2024-05-10' },
  { id: 4, name: 'David Kim', email: 'david@example.com', role: 'User', status: 'Active', joined: '2024-07-01' },
  { id: 5, name: 'Eve Turner', email: 'eve@example.com', role: 'Moderator', status: 'Active', joined: '2025-01-18' },
  { id: 6, name: 'Frank Stone', email: 'frank@example.com', role: 'User', status: 'Inactive', joined: '2025-03-05' },
  { id: 7, name: 'Grace Hall', email: 'grace@example.com', role: 'Admin', status: 'Active', joined: '2025-06-20' },
];

const roleBadge = (role) => {
  const map = { Admin: 'badge-error', Editor: 'badge-warning', Moderator: 'badge-purple', User: 'badge-info' };
  return `badge ${map[role] || 'badge-info'}`;
};

const PER_PAGE = 5;

const Users = () => {
  const [users, setUsers] = useState(initialUsers);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('All');
  const [showModal, setShowModal] = useState(false);
  const [page, setPage] = useState(1);
  const [form, setForm] = useState({ name: '', email: '', role: 'User', status: 'Active', joined: '' });

  const filtered = users.filter(u =>
    (filterRole === 'All' || u.role === filterRole) &&
    (u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()))
  );

  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const totalPages = Math.ceil(filtered.length / PER_PAGE);

  const addUser = () => {
    setUsers([{ id: Date.now(), ...form }, ...users]);
    setShowModal(false);
    setForm({ name: '', email: '', role: 'User', status: 'Active', joined: '' });
  };

  const deleteUser = (id) => setUsers(users.filter(u => u.id !== id));

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Users</h1>
          <p className="page-subtitle">Manage user accounts and permissions</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={16} /> Add User
        </button>
      </div>

      <div className="stats-row">
        {userStats.map(s => (
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
          <div className="table-card-title">All Users ({filtered.length})</div>
          <div className="table-actions">
            <div className="search-input-wrap">
              <Search size={16} color="#64748b" />
              <input placeholder="Search users..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
            </div>
            <select className="select-input" value={filterRole} onChange={e => { setFilterRole(e.target.value); setPage(1); }}>
              {['All', 'Admin', 'Editor', 'Moderator', 'User'].map(r => <option key={r}>{r}</option>)}
            </select>
          </div>
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((u, i) => (
                <tr key={u.id}>
                  <td>
                    <div className="user-cell">
                      <div className="avatar-sm" style={{ backgroundColor: avatarColors[i % avatarColors.length] }}>
                        {u.name.charAt(0)}
                      </div>
                      <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{u.name}</span>
                    </div>
                  </td>
                  <td>{u.email}</td>
                  <td><span className={roleBadge(u.role)}>{u.role}</span></td>
                  <td>
                    <span className={`badge ${u.status === 'Active' ? 'badge-success' : 'badge-error'}`}>{u.status}</span>
                  </td>
                  <td>{u.joined}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="btn btn-secondary btn-icon btn-sm" title="Edit"><Pencil size={14} /></button>
                      <button className="btn btn-danger btn-icon btn-sm" title="Delete" onClick={() => deleteUser(u.id)}><Trash2 size={14} /></button>
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
              <span className="modal-title">Add New User</span>
              <button className="btn btn-secondary btn-icon" onClick={() => setShowModal(false)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Full name" />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input type="email" className="form-input" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="email@example.com" />
              </div>
              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">Role</label>
                  <select className="form-input" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                    {['User', 'Admin', 'Editor', 'Moderator'].map(r => <option key={r}>{r}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select className="form-input" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                    {['Active', 'Inactive'].map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Join Date</label>
                  <input type="date" className="form-input" value={form.joined} onChange={e => setForm({ ...form, joined: e.target.value })} />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={addUser}>Add User</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;
