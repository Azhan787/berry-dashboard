import React, { useCallback, useEffect, useState } from 'react';
import { Search, Plus, Trash2, X, Users, Pencil } from 'lucide-react';
import './pages.css';
import { apiRequest } from '../lib/auth';
import { useAuth } from '../contexts/AuthContextValue';

const PER_PAGE = 10;
const statusBadge = (status) => `badge ${{ active: 'badge-success', inactive: 'badge-error', lead: 'badge-warning' }[status] || 'badge-info'}`;

export default function Customers() {
  const { activeOrganizationId, organizations } = useAuth();
  const canManage = ['owner','admin','manager'].includes(organizations.find((item) => item.id === activeOrganizationId)?.role);
  const [customerState, setCustomerState] = useState({ organizationId: null, customers: [], total: 0 });
  const loading = customerState.organizationId !== activeOrganizationId;
  const customers = customerState.organizationId === activeOrganizationId ? customerState.customers : [];
  const total = customerState.organizationId === activeOrganizationId ? customerState.total : 0;
  const [search, setSearch] = useState(''); const [status, setStatus] = useState('All'); const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false); const [editingId, setEditingId] = useState(null); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', email: '', phone: '', company_name: '', status: 'lead' });
  const load = useCallback(async () => {
    try { const query = new URLSearchParams({ page, limit: PER_PAGE, search }); if (status !== 'All') query.set('status', status); const result = await apiRequest(`/customers?${query}`); setCustomerState({ organizationId: activeOrganizationId, customers: result.items || [], total: result.total || 0 }); }
    catch (err) { setError(err.message); setCustomerState({ organizationId: activeOrganizationId, customers: [], total: 0 }); }
    finally { setBusy(false); }
  }, [activeOrganizationId, page, search, status]);
  useEffect(() => {
    let active = true;
    const query = new URLSearchParams({ page, limit: PER_PAGE, search });
    if (status !== 'All') query.set('status', status);
    apiRequest(`/customers?${query}`).then((result) => {
      if (active) setCustomerState({ organizationId: activeOrganizationId, customers: result.items || [], total: result.total || 0 });
    }).catch((err) => {
      if (active) { setError(err.message); setCustomerState({ organizationId: activeOrganizationId, customers: [], total: 0 }); }
    });
    return () => { active = false; };
  }, [activeOrganizationId, page, search, status]);
  const saveCustomer = async (event) => {
    event.preventDefault(); setBusy(true); setError('');
    try { await apiRequest(editingId ? `/customers/${editingId}` : '/customers', { method: editingId ? 'PATCH' : 'POST', body: form }); setShowModal(false); setEditingId(null); setForm({ name: '', email: '', phone: '', company_name: '', status: 'lead' }); setPage(1); await load(); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };
  const startEdit = (customer) => { setEditingId(customer.id); setForm({ name: customer.name, email: customer.email || '', phone: customer.phone || '', company_name: customer.company_name || '', status: customer.status }); setShowModal(true); };
  const deleteCustomer = async (id) => { const customer = customers.find((row) => row.id === id); if (!window.confirm(`Delete ${customer?.name || 'this customer'}?`)) return; setError(''); try { await apiRequest(`/customers/${id}`, { method: 'DELETE' }); await load(); } catch (err) { setError(err.message); } };
  const pages = Math.ceil(total / PER_PAGE);

  return <div>
    <div className="page-header"><div><h1 className="page-title">Customers</h1><p className="page-subtitle">Manage customers in this workspace.</p></div>{canManage && <button className="btn btn-primary" onClick={() => { setEditingId(null); setForm({ name: '', email: '', phone: '', company_name: '', status: 'lead' }); setShowModal(true); }}><Plus size={16} /> Add Customer</button>}</div>
    <div className="stats-row"><div className="mini-stat-card"><div className="mini-stat-icon" style={{ backgroundColor: 'rgba(103,58,183,.15)' }}><Users size={22} color="#673ab7" /></div><div><div className="mini-stat-value">{total.toLocaleString()}</div><div className="mini-stat-label">Customers</div></div></div></div>
    {error && <div role="alert" className="dashboard-state dashboard-error">{error}</div>}
    <div className="table-card"><div className="table-card-header"><div className="table-card-title">Customer List ({total})</div><div className="table-actions"><div className="search-input-wrap"><Search size={16} color="#64748b" /><input placeholder="Search customers..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} /></div><select className="select-input" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>{['All', 'lead', 'active', 'inactive'].map((item) => <option key={item} value={item}>{item === 'All' ? 'All statuses' : item[0].toUpperCase() + item.slice(1)}</option>)}</select></div></div>
      <div className="table-responsive"><table className="data-table"><thead><tr><th>Customer</th><th>Email</th><th>Phone</th><th>Company</th><th>Status</th>{canManage && <th>Actions</th>}</tr></thead><tbody>
        {customers.map((customer, index) => <tr key={customer.id}><td><div className="user-cell"><div className="avatar-sm" style={{ backgroundColor: ['#673ab7', '#2196f3', '#00c853', '#ffc107'][index % 4] }}>{customer.name?.charAt(0)}</div><span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{customer.name}</span></div></td><td>{customer.email || '—'}</td><td>{customer.phone || '—'}</td><td>{customer.company_name || '—'}</td><td><span className={statusBadge(customer.status)}>{customer.status}</span></td>{canManage && <td><div className="invoice-actions"><button className="btn btn-secondary btn-icon btn-sm" title="Edit customer" aria-label={`Edit ${customer.name}`} onClick={() => startEdit(customer)}><Pencil size={14} /></button><button className="btn btn-danger btn-icon btn-sm" title="Delete customer" aria-label={`Delete ${customer.name}`} onClick={() => deleteCustomer(customer.id)}><Trash2 size={14} /></button></div></td>}</tr>)}
        {!busy && !loading && customers.length === 0 && <tr><td colSpan={canManage ? 6 : 5}>{search ? 'No customers match this search.' : 'No customers yet. Add your first customer to get started.'}</td></tr>}{(busy || loading) && <tr><td colSpan={canManage ? 6 : 5}>Loading customers…</td></tr>}
      </tbody></table></div>
      <div className="pagination"><span className="pagination-info">{total ? `Showing ${(page - 1) * PER_PAGE + 1}–${Math.min(page * PER_PAGE, total)} of ${total}` : 'No records'}</span><div className="pagination-btns">{Array.from({ length: pages }, (_, index) => index + 1).map((value) => <button key={value} className={`page-btn ${value === page ? 'active' : ''}`} onClick={() => setPage(value)}>{value}</button>)}</div></div>
    </div>
    {showModal && <div className="modal-backdrop" onClick={() => setShowModal(false)}><form className="modal" onSubmit={saveCustomer} onClick={(event) => event.stopPropagation()}><div className="modal-header"><span className="modal-title">{editingId ? 'Edit customer' : 'Add Customer'}</span><button type="button" className="btn btn-secondary btn-icon" onClick={() => setShowModal(false)}><X size={18} /></button></div><div className="modal-body"><div className="form-grid-2">
      <div className="form-group"><label className="form-label">Full name</label><input required maxLength="160" className="form-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
      <div className="form-group"><label className="form-label">Email</label><input type="email" className="form-input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
      <div className="form-group"><label className="form-label">Phone</label><input className="form-input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
      <div className="form-group"><label className="form-label">Company</label><input className="form-input" value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} /></div>
      <div className="form-group"><label className="form-label">Status</label><select className="form-input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><option value="lead">Lead</option><option value="active">Active</option><option value="inactive">Inactive</option></select></div>
    </div></div><div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button><button type="submit" className="btn btn-primary" disabled={busy}>Save customer</button></div></form></div>}
  </div>;
}
