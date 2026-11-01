import React, { useEffect, useState } from 'react';
import { BriefcaseBusiness, CircleCheck, FileText, Users } from 'lucide-react';
import { apiRequest } from '../lib/auth';
import { useAuth } from '../contexts/AuthContextValue';
import './pages.css';

const money = (value, currency) => value == null ? '—' : new Intl.NumberFormat(undefined, { style: 'currency', currency: currency || 'USD', maximumFractionDigits: 0 }).format(Number(value));

export default function Dashboard() {
  const { activeOrganizationId, organizations } = useAuth();
  const [resultState, setResultState] = useState(null);
  const data = resultState?.organizationId === activeOrganizationId ? resultState.data : null;
  const error = resultState?.organizationId === activeOrganizationId ? resultState.error : '';
  useEffect(() => {
    let active = true;
    apiRequest('/dashboard').then((result) => { if (active) setResultState({ organizationId: activeOrganizationId, data: result }); }).catch((err) => { if (active) setResultState({ organizationId: activeOrganizationId, error: err.message }); });
    return () => { active = false; };
  }, [activeOrganizationId]);
  const cards = [
    { label: 'Customers', value: data?.customers?.toLocaleString() ?? '—', icon: Users, color: '#673ab7' },
    { label: 'Invoiced', value: data ? money(data.invoiced, data.currency) : '—', icon: FileText, color: '#2196f3' },
    { label: 'Active projects', value: data?.activeProjects?.toLocaleString() ?? '—', icon: BriefcaseBusiness, color: '#00c853' },
    { label: 'Open tasks', value: data?.openTasks?.toLocaleString() ?? '—', icon: CircleCheck, color: '#ffc107' },
  ];
  return <section className="business-dashboard">
    <div className="page-header"><div><h1 className="page-title">{organizations.find((item) => item.id === activeOrganizationId)?.name || 'Workspace'} overview</h1><p className="page-subtitle">A live summary of your organization’s records.</p></div></div>
    {error && <div className="dashboard-state dashboard-error">{error}</div>}
    <div className="business-metrics">{cards.map(({ label, value, icon: Icon, color }) => <article className="business-metric" key={label}><span style={{ color, background: `${color}20` }}><Icon size={21} /></span><div><b>{value}</b><small>{label}</small></div></article>)}</div>
    <div className="business-panel"><h2>Workspace activity</h2>{!data ? <p>{error ? 'Dashboard metrics could not be loaded.' : 'Loading organization data…'}</p> : data.customers === 0 && data.invoiced === 0 && data.activeProjects === 0 && data.openTasks === 0 ? <p>Your workspace is ready. Add customers, invoices, projects, or tasks to see organization metrics here.</p> : <p>Outstanding invoices: {money(data.outstanding, data.currency)}{data.currencyMix?.length ? ` · Records use multiple currencies (${data.currencyMix.join(', ')}); totals are kept separate.` : ''}</p>}</div>
  </section>;
}
