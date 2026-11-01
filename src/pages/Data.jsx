import React, { useEffect, useState } from 'react';
import { Download, FileUp, FileText, Trash2 } from 'lucide-react';
import { apiDownload, apiRequest } from '../lib/auth';
import { useAuth } from '../contexts/AuthContextValue';
import './pages.css';

const exportTypes = [
  ['customers', 'Customers CSV'], ['deals', 'Deals CSV'], ['invoices', 'Invoices CSV'], ['projects', 'Projects CSV'], ['tasks', 'Tasks CSV'],
];
const fileSize = (value) => value < 1024 ? `${value} B` : value < 1048576 ? `${(value / 1024).toFixed(1)} KB` : `${(value / 1048576).toFixed(1)} MB`;

export default function Data() {
  const { activeOrganizationId, organizations } = useAuth();
  const canManage = ['owner','admin','manager'].includes(organizations.find((item) => item.id === activeOrganizationId)?.role);
  const canAudit = ['owner','admin'].includes(organizations.find((item) => item.id === activeOrganizationId)?.role);
  const [state, setState] = useState({ organizationId: null, files: [], activity: [] }); const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [notice, setNotice] = useState('');
  const files = state.organizationId === activeOrganizationId ? state.files : [];
  const load = async () => { const [result, activity] = await Promise.all([apiRequest('/files'), canAudit ? apiRequest('/activity?limit=50') : Promise.resolve([])]); setState({ organizationId: activeOrganizationId, files: result || [], activity: activity || [] }); };
  useEffect(() => { let active = true; Promise.all([apiRequest('/files'), canAudit ? apiRequest('/activity?limit=50') : Promise.resolve([])]).then(([result, activity]) => { if (active) setState({ organizationId: activeOrganizationId, files: result || [], activity: activity || [] }); }).catch((err) => { if (active) setError(err.message); }); return () => { active = false; }; }, [activeOrganizationId, canAudit]);
  const upload = async (event) => {
    const file = event.target.files?.[0]; event.target.value = ''; if (!file) return;
    setBusy(true); setError(''); setNotice('');
    try { await apiRequest('/files', { method: 'POST', rawBody: file, contentType: file.type || 'application/octet-stream', headers: { 'X-File-Name': encodeURIComponent(file.name) } }); setNotice('File uploaded to this workspace.'); await load(); }
    catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  const download = async (file) => { setBusy(true); setError(''); try { const result = await apiRequest(`/files/${file.id}/download`); const link = document.createElement('a'); link.href = result.url; link.download = file.original_name; link.rel = 'noopener'; link.click(); } catch (err) { setError(err.message); } finally { setBusy(false); } };
  const remove = async (file) => { if (!window.confirm(`Delete ${file.original_name} from this workspace?`)) return; setBusy(true); try { await apiRequest(`/files/${file.id}`, { method: 'DELETE' }); setNotice('File deleted.'); await load(); } catch (err) { setError(err.message); } finally { setBusy(false); } };
  const downloadCsv = async (resource) => { setBusy(true); setError(''); try { const blob = await apiDownload(`/exports/${resource}.csv`); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = `berry-${resource}.csv`; link.click(); URL.revokeObjectURL(url); } catch (err) { setError(err.message); } finally { setBusy(false); } };
  return <section className="business-dashboard"><div className="page-header"><div><h1 className="page-title">Data & exports</h1><p className="page-subtitle">Download workspace records and manage private files.</p></div>{canManage && <label className={`btn btn-primary file-upload-button${busy ? ' disabled' : ''}`}><FileUp size={16} /> {busy ? 'Working…' : 'Upload file'}<input type="file" accept="application/pdf,image/jpeg,image/png,image/webp,text/plain,text/csv" disabled={busy} onChange={upload} /></label>}</div>
    {error && <div role="alert" className="dashboard-state dashboard-error">{error}</div>}{notice && <div className="invoice-notice">{notice}</div>}
    <div className="analytics-grid"><article className="business-panel"><h2>CSV exports</h2><p className="data-help">Exports include records visible to your role and are limited to 5,000 rows each.</p><div className="export-buttons">{exportTypes.map(([resource, label]) => <button key={resource} className="btn btn-secondary" disabled={busy} onClick={() => downloadCsv(resource)}><Download size={15} /> {label}</button>)}</div></article><article className="business-panel"><h2>Private workspace files</h2><p className="data-help">PDF, images, CSV, and text files up to 10 MB. Download links expire after one minute.</p><div className="data-file-list">{files.map((file) => <div className="data-file" key={file.id}><FileText size={18} /><div><strong>{file.original_name}</strong><small>{fileSize(Number(file.size_bytes))} · {new Date(file.created_at).toLocaleDateString()}</small></div><button className="btn btn-secondary btn-icon btn-sm" aria-label={`Download ${file.original_name}`} disabled={busy} onClick={() => download(file)}><Download size={14} /></button>{canManage && <button className="btn btn-danger btn-icon btn-sm" aria-label={`Delete ${file.original_name}`} disabled={busy} onClick={() => remove(file)}><Trash2 size={14} /></button>}</div>)}{!files.length && <p className="data-help">No files uploaded to this workspace.</p>}</div></article>
      {canAudit && <article className="business-panel"><h2>Recent activity</h2><div className="data-file-list">{state.organizationId === activeOrganizationId && state.activity.map((item) => <div className="data-file" key={item.id}><div><strong>{item.action.replaceAll('_',' ')}</strong><small>{item.metadata?.label || item.entity_type} · {item.actor?.full_name || item.actor?.email || 'Former member'} · {new Date(item.created_at).toLocaleString()}</small></div></div>)}{!state.activity.length && <p className="data-help">No activity recorded yet.</p>}</div></article>}
    </div>
  </section>;
}
