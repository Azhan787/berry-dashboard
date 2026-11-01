import React, { useEffect, useMemo, useState } from 'react';
import { Activity, BriefcaseBusiness, ChartNoAxesCombined, CircleAlert, RefreshCw, Users } from 'lucide-react';
import { CartesianGrid, Bar, BarChart, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { apiRequest } from '../lib/auth';
import { useAuth } from '../contexts/AuthContextValue';
import './pages.css';

const isoDate = (date) => date.toISOString().slice(0, 10);
const initialRange = () => {
  const end = new Date();
  const start = new Date(end.getFullYear(), end.getMonth() - 11, 1);
  return { from: isoDate(start), to: isoDate(end) };
};
const statusColors = ['#60a5fa', '#34d399', '#fbbf24', '#f87171', '#a78bfa', '#22d3ee'];
const monthLabel = (month) => new Date(`${month}-01T00:00:00`).toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
const currencyValue = (value, currency) => new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 0 }).format(Number(value || 0));

export default function AnalyticsView({ page = 'Analytics' }) {
  const { activeOrganizationId } = useAuth();
  const [range, setRange] = useState(initialRange);
  const [report, setReport] = useState({ organizationId: null, data: null });
  const [currency, setCurrency] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const data = report.organizationId === activeOrganizationId ? report.data : null;

  const load = async (selectedRange = range, organizationId = activeOrganizationId) => {
    if (!organizationId) return;
    setBusy(true); setError('');
    try {
      const result = await apiRequest(`/analytics?from=${encodeURIComponent(selectedRange.from)}&to=${encodeURIComponent(selectedRange.to)}`);
      setReport({ organizationId, data: result });
      const currencies = [...new Set([...(result.revenueTrend || []).map((row) => row.currency), ...(result.collectionsTrend || []).map((row) => row.currency), ...(result.dealPipeline || []).map((row) => row.currency)])].sort();
      setCurrency((current) => currencies.includes(current) ? current : currencies[0] || 'USD');
    } catch (err) { setError(err.message); setReport({ organizationId, data: null }); }
    finally { setBusy(false); }
  };

  useEffect(() => {
    let active = true;
    const selectedRange = range;
    if (activeOrganizationId) {
      apiRequest(`/analytics?from=${encodeURIComponent(selectedRange.from)}&to=${encodeURIComponent(selectedRange.to)}`).then((result) => {
        if (!active) return;
        setReport({ organizationId: activeOrganizationId, data: result });
        const currencies = [...new Set([...(result.revenueTrend || []).map((row) => row.currency), ...(result.collectionsTrend || []).map((row) => row.currency), ...(result.dealPipeline || []).map((row) => row.currency)])].sort();
        setCurrency((current) => currencies.includes(current) ? current : currencies[0] || 'USD'); setError('');
      }).catch((err) => { if (active) setError(err.message); });
    }
    return () => { active = false; };
  }, [activeOrganizationId, range]);

  const currencies = useMemo(() => [...new Set([...(data?.revenueTrend || []).map((row) => row.currency), ...(data?.collectionsTrend || []).map((row) => row.currency), ...(data?.dealPipeline || []).map((row) => row.currency)])].sort(), [data]);
  const trend = useMemo(() => {
    const months = new Set([...(data?.revenueTrend || []).filter((row) => row.currency === currency).map((row) => row.month), ...(data?.collectionsTrend || []).filter((row) => row.currency === currency).map((row) => row.month)]);
    return [...months].sort().map((month) => ({ month: monthLabel(month), invoiced: Number(data.revenueTrend.find((row) => row.month === month && row.currency === currency)?.invoiced || 0), collected: Number(data.collectionsTrend.find((row) => row.month === month && row.currency === currency)?.collected || 0) }));
  }, [data, currency]);
  const statusData = data?.invoiceStatus || [];
  const pipeline = (data?.dealPipeline || []).filter((row) => row.currency === currency).map((row) => ({ name: row.stage, value: Number(row.value), deals: Number(row.deal_count) }));

  return <section className="business-dashboard analytics-page">
    <div className="page-header"><div><h1 className="page-title">{page}</h1><p className="page-subtitle">Live reporting for this workspace, with financial totals kept in their original currency.</p></div><button className="btn btn-outline" onClick={() => load()} disabled={busy}><RefreshCw size={16} /> {busy ? 'Refreshing…' : 'Refresh'}</button></div>
    {error && <div className="analytics-error"><CircleAlert size={17} />{error}</div>}
    <div className="analytics-filters"><label>From<input type="date" value={range.from} max={range.to} onChange={(event) => setRange((current) => ({ ...current, from: event.target.value }))} /></label><label>To<input type="date" value={range.to} min={range.from} onChange={(event) => setRange((current) => ({ ...current, to: event.target.value }))} /></label><label>Currency<select value={currency} onChange={(event) => setCurrency(event.target.value)}>{(currencies.length ? currencies : ['USD']).map((code) => <option key={code} value={code}>{code}</option>)}</select></label><button className="btn btn-primary" onClick={() => load()} disabled={busy}>Apply range</button></div>
    {!data && !error && <div className="business-panel">Loading organization analytics…</div>}
    {data && <>
      <div className="business-metrics analytics-metrics"><article className="business-metric"><span><ChartNoAxesCombined size={20} /></span><div><b>{statusData.reduce((sum, row) => sum + Number(row.count), 0)}</b><small>Invoices in range</small></div></article><article className="business-metric"><span><Users size={20} /></span><div><b>{(data.customerGrowth || []).reduce((sum, row) => sum + Number(row.customers), 0)}</b><small>Customers added</small></div></article><article className="business-metric"><span><BriefcaseBusiness size={20} /></span><div><b>{(data.projectStatus || []).reduce((sum, row) => sum + Number(row.count), 0)}</b><small>Projects</small></div></article><article className="business-metric"><span><Activity size={20} /></span><div><b>{(data.taskStatus || []).reduce((sum, row) => sum + Number(row.count), 0)}</b><small>Tasks</small></div></article></div>
      <div className="analytics-grid"><article className="business-panel analytics-chart"><h2>Invoices and collections by month</h2><ResponsiveContainer width="100%" height={280}><BarChart data={trend}><CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" /><XAxis dataKey="month" /><YAxis tickFormatter={(value) => currencyValue(value, currency)} width={84} /><Tooltip formatter={(value) => currencyValue(value, currency)} /><Legend /><Bar dataKey="invoiced" name="Invoiced" fill="#7c5cff" radius={[4, 4, 0, 0]} /><Bar dataKey="collected" name="Collected" fill="#34d399" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></article>
      <article className="business-panel analytics-chart"><h2>Invoice status</h2>{statusData.length ? <ResponsiveContainer width="100%" height={280}><PieChart><Pie data={statusData.map((row) => ({ name: row.status, value: Number(row.count) }))} dataKey="value" nameKey="name" outerRadius={92} label>{statusData.map((row, index) => <Cell key={row.status} fill={statusColors[index % statusColors.length]} />)}</Pie><Tooltip /><Legend /></PieChart></ResponsiveContainer> : <p>No invoices in this date range.</p>}</article>
      <article className="business-panel analytics-chart"><h2>Deal pipeline · {currency}</h2>{pipeline.length ? <ResponsiveContainer width="100%" height={250}><BarChart data={pipeline}><CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" /><XAxis dataKey="name" /><YAxis tickFormatter={(value) => currencyValue(value, currency)} width={84} /><Tooltip formatter={(value, name) => name === 'value' ? currencyValue(value, currency) : value} /><Bar dataKey="value" name="Pipeline value" fill="#60a5fa" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer> : <p>No deals recorded in {currency}.</p>}</article>
      <article className="business-panel analytics-chart"><h2>Customers added by month</h2>{data.customerGrowth?.length ? <ResponsiveContainer width="100%" height={250}><BarChart data={data.customerGrowth.map((row) => ({ month: monthLabel(row.month), customers: Number(row.customers) }))}><CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" /><XAxis dataKey="month" /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="customers" name="New customers" fill="#fbbf24" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer> : <p>No customers were added in this date range.</p>}</article></div>
    </>}
  </section>;
}
