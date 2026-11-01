import React, { useEffect, useState } from 'react';
import { BriefcaseBusiness, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import { apiRequest } from '../lib/auth';
import { useAuth } from '../contexts/AuthContextValue';
import './pages.css';

const stages = ['lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost'];
const emptyDeal = (currency = 'USD') => ({ customer_id: '', title: '', description: '', value: '0.00', currency, stage: 'lead', expected_close_date: '', assigned_to: '' });
const money = (amount, currency) => new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 2 }).format(Number(amount || 0));

export default function CRM() {
  const { activeOrganizationId, organizations } = useAuth();
  const organization = organizations.find((item) => item.id === activeOrganizationId);
  const canManage = ['owner', 'admin', 'manager'].includes(organization?.role);
  const [state, setState] = useState({ organizationId: null, deals: [], customers: [], total: 0 });
  const [search, setSearch] = useState(''); const [stage, setStage] = useState('All'); const [page, setPage] = useState(1);
  const [modal, setModal] = useState(false); const [editing, setEditing] = useState(null); const [form, setForm] = useState(emptyDeal());
  const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [notice, setNotice] = useState('');
  const deals = state.organizationId === activeOrganizationId ? state.deals : [];
  const customers = state.organizationId === activeOrganizationId ? state.customers : [];
  const total = state.organizationId === activeOrganizationId ? state.total : 0;
  const currency = form.currency || organization?.default_currency || 'USD';

  const load = async () => {
    if (!activeOrganizationId) return;
    try {
      const query = new URLSearchParams({ page, limit: 20, search }); if (stage !== 'All') query.set('stage', stage);
      const [result, customerPage] = await Promise.all([apiRequest(`/deals?${query}`), apiRequest('/customers?limit=100&page=1')]);
      setState({ organizationId: activeOrganizationId, deals: result.items || [], total: result.total || 0, customers: customerPage.items || [] }); setError('');
    } catch (err) { setError(err.message); setState({ organizationId: activeOrganizationId, deals: [], customers: [], total: 0 }); }
  };
  useEffect(() => {
    let active = true;
    if (activeOrganizationId) {
      const query = new URLSearchParams({ page, limit: 20, search }); if (stage !== 'All') query.set('stage', stage);
      Promise.all([apiRequest(`/deals?${query}`), apiRequest('/customers?limit=100&page=1')]).then(([result, customerPage]) => { if (active) { setState({ organizationId: activeOrganizationId, deals: result.items || [], total: result.total || 0, customers: customerPage.items || [] }); setError(''); } }).catch((err) => { if (active) setError(err.message); });
    }
    return () => { active = false; };
  }, [activeOrganizationId, page, search, stage]);

  const startCreate = () => { setEditing(null); setForm(emptyDeal(organization?.default_currency)); setModal(true); setError(''); };
  const startEdit = (deal) => { setEditing(deal.id); setForm({ customer_id: deal.customer_id, title: deal.title, description: deal.description || '', value: String(deal.value), currency: deal.currency, stage: deal.stage, expected_close_date: deal.expected_close_date || '', assigned_to: deal.assigned_to || '' }); setModal(true); };
  const save = async (event) => {
    event.preventDefault(); setBusy(true); setError(''); setNotice('');
    try { const body = { ...form, expected_close_date: form.expected_close_date || null, assigned_to: form.assigned_to || null }; await apiRequest(editing ? `/deals/${editing}` : '/deals', { method: editing ? 'PATCH' : 'POST', body }); setModal(false); setNotice(editing ? 'Deal updated.' : 'Deal created.'); await load(); }
    catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  const remove = async (deal) => { if (!window.confirm(`Delete “${deal.title}”?`)) return; setBusy(true); try { await apiRequest(`/deals/${deal.id}`, { method: 'DELETE' }); await load(); } catch (err) { setError(err.message); } finally { setBusy(false); } };
  const totals = Object.entries(deals.filter((deal) => !['won','lost'].includes(deal.stage)).reduce((result, deal) => ({ ...result, [deal.currency]: (result[deal.currency] || 0) + Number(deal.value) }), {}));
  const pageCount = Math.ceil(total / 20);

  return <section className="business-dashboard">
    <div className="page-header"><div><h1 className="page-title">CRM Pipeline</h1><p className="page-subtitle">Track customer opportunities through your sales stages.</p></div>{canManage && <button className="btn btn-primary" onClick={startCreate}><Plus size={16} /> Add deal</button>}</div>
    {notice && <div className="invoice-notice">{notice}</div>}{error && <div role="alert" className="dashboard-state dashboard-error">{error}</div>}
    <div className="business-metrics crm-metrics">{totals.length ? totals.map(([code, amount]) => <article className="business-metric" key={code}><span><BriefcaseBusiness size={20} /></span><div><b>{money(amount, code)}</b><small>Open deal value shown · {code}</small></div></article>) : <article className="business-metric"><span><BriefcaseBusiness size={20} /></span><div><b>{total}</b><small>Deals in this view</small></div></article>}</div>
    <div className="table-card"><div className="table-card-header"><div className="table-card-title">Deals ({total})</div><div className="table-actions"><div className="search-input-wrap"><Search size={16} /><input aria-label="Search deals" placeholder="Search deal titles" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} /></div><select className="select-input" value={stage} onChange={(event) => { setStage(event.target.value); setPage(1); }}><option value="All">All stages</option>{stages.map((item) => <option key={item} value={item}>{item}</option>)}</select></div></div>
      <div className="table-responsive"><table className="data-table"><thead><tr><th>Deal</th><th>Customer</th><th>Value</th><th>Stage</th><th>Expected close</th>{canManage && <th>Actions</th>}</tr></thead><tbody>{deals.map((deal) => <tr key={deal.id}><td><strong>{deal.title}</strong></td><td>{deal.customer?.company_name || deal.customer?.name || '—'}</td><td>{money(deal.value, deal.currency)}</td><td>{canManage ? <select className="select-input" value={deal.stage} aria-label={`Stage for ${deal.title}`} disabled={busy} onChange={async (event) => { setBusy(true); try { await apiRequest(`/deals/${deal.id}`, { method: 'PATCH', body: { customer_id: deal.customer_id, title: deal.title, value: String(deal.value), currency: deal.currency, stage: event.target.value, expected_close_date: deal.expected_close_date, assigned_to: deal.assigned_to } }); await load(); } catch (err) { setError(err.message); } finally { setBusy(false); } }}>{stages.map((item) => <option key={item} value={item}>{item}</option>)}</select> : <span className="badge badge-info">{deal.stage}</span>}</td><td>{deal.expected_close_date || '—'}</td>{canManage && <td><div className="invoice-actions"><button className="btn btn-secondary btn-icon btn-sm" aria-label={`Edit ${deal.title}`} onClick={() => startEdit(deal)}><Pencil size={14} /></button><button className="btn btn-danger btn-icon btn-sm" aria-label={`Delete ${deal.title}`} onClick={() => remove(deal)}><Trash2 size={14} /></button></div></td>}</tr>)}{!deals.length && <tr><td colSpan={canManage ? 6 : 5}>{search ? 'No deals match this search.' : 'No deals recorded yet. Create a deal to start tracking your pipeline.'}</td></tr>}</tbody></table></div>
      <div className="pagination"><span className="pagination-info">{total ? `Showing ${(page - 1) * 20 + 1}–${Math.min(page * 20, total)} of ${total}` : 'No records'}</span><div className="pagination-btns">{Array.from({ length: pageCount }, (_, index) => <button key={index} className={`page-btn ${page === index + 1 ? 'active' : ''}`} onClick={() => setPage(index + 1)}>{index + 1}</button>)}</div></div>
    </div>
    {modal && <div className="modal-backdrop" onClick={() => setModal(false)}><form className="modal" onSubmit={save} onClick={(event) => event.stopPropagation()}><div className="modal-header"><span className="modal-title">{editing ? 'Edit deal' : 'New deal'}</span><button type="button" className="btn btn-secondary btn-icon" onClick={() => setModal(false)}><X size={18} /></button></div><div className="modal-body"><div className="form-grid-2">
      <div className="form-group"><label className="form-label">Title</label><input required maxLength="180" className="form-input" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></div>
      <div className="form-group"><label className="form-label">Customer</label><select required className="form-input" value={form.customer_id} onChange={(event) => setForm({ ...form, customer_id: event.target.value })}><option value="">Choose customer</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.company_name || customer.name}</option>)}</select></div>
      <div className="form-group"><label className="form-label">Value</label><input required inputMode="decimal" pattern="(?:0|[1-9][0-9]{0,11})(?:\.[0-9]{1,2})?" className="form-input" value={form.value} onChange={(event) => setForm({ ...form, value: event.target.value })} /></div>
      <div className="form-group"><label className="form-label">Currency</label><select className="form-input" value={currency} onChange={(event) => setForm({ ...form, currency: event.target.value })}>{['USD','CAD','GBP','EUR'].map((code) => <option key={code}>{code}</option>)}</select></div>
      <div className="form-group"><label className="form-label">Stage</label><select className="form-input" value={form.stage} onChange={(event) => setForm({ ...form, stage: event.target.value })}>{stages.map((item) => <option key={item}>{item}</option>)}</select></div>
      <div className="form-group"><label className="form-label">Expected close</label><input type="date" className="form-input" value={form.expected_close_date} onChange={(event) => setForm({ ...form, expected_close_date: event.target.value })} /></div>
      <div className="form-group form-span-2"><label className="form-label">Description</label><textarea maxLength="5000" className="form-input" rows="3" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></div>
    </div></div><div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={() => setModal(false)}>Cancel</button><button type="submit" className="btn btn-primary" disabled={busy || !customers.length}>{busy ? 'Saving…' : 'Save deal'}</button></div></form></div>}
  </section>;
}
