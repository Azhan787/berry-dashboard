import React, { useEffect, useState } from 'react';
import { Building2, Save } from 'lucide-react';
import { apiRequest } from '../lib/auth';
import { useAuth } from '../contexts/AuthContextValue';
import './pages.css';
import { buildOrganizationSettingsPayload, emptyOrganizationSettings, normalizeOrganizationSettings, validateOrganizationWebsite } from '../../shared/organizationSettings.js';

export default function OrganizationSettings() {
  const { activeOrganizationId, organizations, refreshOrganizations } = useAuth();
  const canManage = ['owner','admin'].includes(organizations.find((item) => item.id === activeOrganizationId)?.role);
  const [settingsState, setSettingsState] = useState({ organizationId: null, values: emptyOrganizationSettings }); const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [notice, setNotice] = useState('');
  const form = settingsState.organizationId === activeOrganizationId ? settingsState.values : emptyOrganizationSettings;
  const websiteError = validateOrganizationWebsite(form.website);
  useEffect(() => {
    let active = true;
    apiRequest('/organization/settings').then((settings) => { if (active) setSettingsState({ organizationId: activeOrganizationId, values: normalizeOrganizationSettings(settings) }); }).catch((err) => { if (active) setError(err.message); });
    return () => { active = false; };
  }, [activeOrganizationId]);
  const updateFormField = (field, value) => setSettingsState((current) => ({ organizationId: activeOrganizationId, values: { ...(current.organizationId === activeOrganizationId ? current.values : emptyOrganizationSettings), [field]: value } }));
  const save = async (event) => {
    event.preventDefault(); setError(''); setNotice('');
    if (validateOrganizationWebsite(form.website)) return;
    setBusy(true);
    try {
      const payload = buildOrganizationSettingsPayload(form);
      const saved = await apiRequest('/organization/settings', { method: 'PATCH', body: payload });
      setSettingsState({ organizationId: activeOrganizationId, values: normalizeOrganizationSettings(saved || payload) });
      await refreshOrganizations(); setNotice('Workspace settings saved.');
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  if (!canManage) return <div className="business-panel">Only workspace owners and admins can edit organization settings.</div>;
  return <section className="business-dashboard"><div className="page-header"><div><h1 className="page-title">Organization settings</h1><p className="page-subtitle">Set the business details and regional defaults for this workspace.</p></div></div>{error && <div role="alert" className="dashboard-state dashboard-error">{error}</div>}{notice && <div className="invoice-notice">{notice}</div>}<form className="business-panel settings-form" onSubmit={save}><div className="settings-form-title"><span><Building2 size={19} /></span><div><h2>Workspace details</h2><p>These defaults guide business records and number/date presentation.</p></div></div><div className="form-grid-2"><div className="form-group"><label className="form-label">Organization name</label><input required minLength="2" maxLength="120" className="form-input" value={form.name} onChange={(event) => updateFormField('name', event.target.value)} /></div><div className="form-group"><label className="form-label">Website</label><input type="url" maxLength="300" className="form-input" value={form.website} aria-invalid={Boolean(websiteError)} aria-describedby={websiteError ? 'organization-website-error' : undefined} onChange={(event) => updateFormField('website', event.target.value)} placeholder="https://example.com" />{websiteError && <small id="organization-website-error" role="alert" className="form-error">{websiteError}</small>}</div><div className="form-group"><label className="form-label">Industry</label><input maxLength="120" className="form-input" value={form.industry} onChange={(event) => updateFormField('industry', event.target.value)} /></div><div className="form-group"><label className="form-label">Company size</label><select className="form-input" value={form.company_size} onChange={(event) => updateFormField('company_size', event.target.value)}><option value="">Select size</option>{['1','2-10','11-50','51-200','201-500','501+'].map((size) => <option key={size}>{size}</option>)}</select></div><div className="form-group"><label className="form-label">Default currency</label><select className="form-input" value={form.default_currency} onChange={(event) => updateFormField('default_currency', event.target.value)}>{['USD','CAD','GBP','EUR'].map((value) => <option key={value}>{value}</option>)}</select></div><div className="form-group"><label className="form-label">Timezone</label><input required maxLength="80" className="form-input" value={form.timezone} onChange={(event) => updateFormField('timezone', event.target.value)} /></div><div className="form-group"><label className="form-label">Locale</label><input required minLength="2" maxLength="10" className="form-input" value={form.locale} onChange={(event) => updateFormField('locale', event.target.value)} /></div></div><div className="settings-save"><button className="btn btn-primary" disabled={busy}><Save size={15} /> {busy ? 'Saving…' : 'Save settings'}</button></div></form></section>;
}
