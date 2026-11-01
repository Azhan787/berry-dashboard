import React, { useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Building2, LoaderCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContextValue';
import { apiRequest, authRequest } from '../lib/auth';
import './auth.css';

function AuthShell({ title, subtitle, children }) {
  const { configured } = useAuth();
  return <main className="auth-shell"><section className="auth-card">
    <div className="auth-brand"><span className="auth-brand-mark"><Building2 size={21} /></span><span>Berry</span></div>
    <h1>{title}</h1><p className="auth-subtitle">{subtitle}</p>
    {!configured && <div className="auth-config-message">Authentication is disabled until the API server and its Supabase connection are configured.</div>}
    {children}
  </section></main>;
}

export function Login() {
  const { login, session } = useAuth(); const navigate = useNavigate();
  const location = useLocation(); const returnTo = new URLSearchParams(location.search).get('returnTo'); const destination = returnTo?.startsWith('/') && !returnTo.startsWith('//') ? returnTo : '/';
  const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  if (session) return <Navigate to={destination} replace />;
  const submit = async (event) => { event.preventDefault(); setBusy(true); setError(''); try { await login(email, password); navigate(destination, { replace: true }); } catch (err) { setError(err.message); } finally { setBusy(false); } };
  return <AuthShell title="Welcome back" subtitle="Sign in to your Berry workspace."><form onSubmit={submit} className="auth-form">
    <label>Email<input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
    <label>Password<input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} /></label>
    {error && <p className="auth-error">{error}</p>}
    <button className="auth-submit" disabled={busy}>{busy ? <LoaderCircle size={17} className="auth-spin" /> : 'Sign in'}</button>
    <p className="auth-switch"><Link to="/forgot-password">Forgot your password?</Link></p>
    <p className="auth-switch">New to Berry? <Link to={`/register${location.search}`}>Create an account</Link></p>
  </form></AuthShell>;
}

export function Register() {
  const { signup, session } = useAuth(); const navigate = useNavigate();
  const location = useLocation(); const returnTo = new URLSearchParams(location.search).get('returnTo'); const destination = returnTo?.startsWith('/') && !returnTo.startsWith('//') ? returnTo : '/onboarding';
  const [name, setName] = useState(''); const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [notice, setNotice] = useState(''); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  if (session) return <Navigate to={destination} replace />;
  const submit = async (event) => { event.preventDefault(); setBusy(true); setError(''); try { const result = await signup(email, password, name); if (result.authenticated) navigate(destination, { replace: true }); else setNotice('Check your email to verify your account, then sign in.'); } catch (err) { setError(err.message); } finally { setBusy(false); } };
  return <AuthShell title="Create your workspace account" subtitle="Start with your team’s private business workspace."><form onSubmit={submit} className="auth-form">
    <label>Full name<input autoComplete="name" required value={name} onChange={(e) => setName(e.target.value)} /></label>
    <label>Work email<input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
    <label>Password<input type="password" autoComplete="new-password" minLength={8} required value={password} onChange={(e) => setPassword(e.target.value)} /></label>
    {error && <p className="auth-error">{error}</p>}{notice && <p className="auth-notice">{notice}</p>}
    <button className="auth-submit" disabled={busy}>{busy ? <LoaderCircle size={17} className="auth-spin" /> : 'Create account'}</button>
    <p className="auth-switch">Already registered? <Link to={`/login${location.search}`}>Sign in</Link></p>
  </form></AuthShell>;
}

export function Onboarding() {
  const { organizations, createOrganization, loading, session } = useAuth(); const navigate = useNavigate();
  const [name, setName] = useState(''); const [currency, setCurrency] = useState('USD'); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  if (!session && !loading) return <Navigate to="/login" replace />;
  if (organizations.length && !busy) return <Navigate to="/" replace />;
  const submit = async (event) => { event.preventDefault(); setBusy(true); setError(''); try { await createOrganization({ name, default_currency: currency, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC' }); navigate('/', { replace: true }); } catch (err) { setError(err.message); } finally { setBusy(false); } };
  return <AuthShell title="Set up your workspace" subtitle="Your organization’s records are kept private from other workspaces."><form onSubmit={submit} className="auth-form">
    <label>Organization name<input required minLength={2} maxLength={120} value={name} onChange={(e) => setName(e.target.value)} placeholder="Acme Studio" /></label>
    <label>Default currency<select value={currency} onChange={(e) => setCurrency(e.target.value)}><option value="USD">USD · US Dollar</option><option value="CAD">CAD · Canadian Dollar</option><option value="GBP">GBP · British Pound</option><option value="EUR">EUR · Euro</option></select></label>
    {error && <p className="auth-error">{error}</p>}<button className="auth-submit" disabled={busy}>{busy ? <LoaderCircle size={17} className="auth-spin" /> : 'Create workspace'}</button>
  </form></AuthShell>;
}

export function AuthCallback() {
  const { adoptSession } = useAuth(); const location = useLocation(); const navigate = useNavigate();
  const [error, setError] = useState(''); const [working, setWorking] = useState(true);
  useEffect(() => {
    let active = true;
    const finish = async () => {
      const fragment = new URLSearchParams(location.hash.slice(1));
      if (location.hash) window.history.replaceState(null, document.title, `${location.pathname}${location.search}`);
      const authError = fragment.get('error_description') || fragment.get('error');
      if (authError) { if (active) { setError(authError); setWorking(false); } return; }
      const accessToken = fragment.get('access_token'); const refreshToken = fragment.get('refresh_token');
      if (!accessToken || !refreshToken) { if (active) { setError('The confirmation link did not include a session. Request a new link or sign in.'); setWorking(false); } return; }
      try {
        await adoptSession({ access_token: accessToken, refresh_token: refreshToken, expires_in: Number(fragment.get('expires_in') || 3600), token_type: fragment.get('token_type') || 'bearer' });
        const requested = new URLSearchParams(location.search).get('returnTo');
        const target = fragment.get('type') === 'recovery' ? '/reset-password' : requested?.startsWith('/') && !requested.startsWith('//') ? requested : '/onboarding';
        if (active) navigate(target, { replace: true });
      } catch (err) { if (active) { setError(err.message); setWorking(false); } }
    };
    finish(); return () => { active = false; };
  }, [adoptSession, location.hash, location.pathname, location.search, navigate]);
  return <AuthShell title="Confirming your account" subtitle="Finishing the secure sign-in flow.">{working ? <div className="auth-loading"><LoaderCircle className="auth-spin" /> Checking confirmation…</div> : <><p className="auth-error">{error}</p><p className="auth-switch"><Link to="/login">Continue to sign in</Link></p></>}</AuthShell>;
}

export function AcceptInvite() {
  const { session, refreshOrganizations, chooseOrganization } = useAuth(); const location = useLocation(); const navigate = useNavigate();
  const [working, setWorking] = useState(false); const [error, setError] = useState(''); const [accepted, setAccepted] = useState(false);
  const invite = new URLSearchParams(location.hash.slice(1)); const organizationId = invite.get('organizationId'); const token = invite.get('token');
  const returnTo = `${location.pathname}${location.search}${location.hash}`;
  const accept = async () => {
    setWorking(true); setError('');
    try { await apiRequest('/invitations/accept', { method: 'POST', body: { organization_id: organizationId, token } }); const organizations = await refreshOrganizations(); if (!organizations.some((item) => item.id === organizationId)) throw new Error('The workspace membership was accepted but could not be loaded. Sign in again.'); chooseOrganization(organizationId); setAccepted(true); navigate('/', { replace: true }); }
    catch (err) { setError(err.message); } finally { setWorking(false); }
  };
  if (!organizationId || !token || !/^[0-9a-f]{64}$/.test(token)) return <AuthShell title="Invitation link is invalid" subtitle="Ask the workspace owner to send a new invitation." />;
  return <AuthShell title="Join a Berry workspace" subtitle="Sign in with the email address that received this invitation to accept it.">
    {!session && <div className="auth-form"><Link className="auth-submit auth-link-button" to={`/login?returnTo=${encodeURIComponent(returnTo)}`}>Sign in to accept</Link><Link className="auth-switch" to={`/register?returnTo=${encodeURIComponent(returnTo)}`}>Create an account with the invited email</Link></div>}
    {session && <div className="auth-form"><p>{accepted ? 'Invitation accepted.' : 'Your signed-in email must match the invitation recipient.'}</p><button className="auth-submit" disabled={working} onClick={accept}>{working ? 'Accepting…' : 'Accept invitation'}</button></div>}
    {error && <p className="auth-error">{error}</p>}
  </AuthShell>;
}

export function ForgotPassword() {
  const [email, setEmail] = useState(''); const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [notice, setNotice] = useState('');
  const submit = async (event) => { event.preventDefault(); setBusy(true); setError(''); setNotice(''); try { await authRequest('recover', { email }); setNotice('If this email belongs to an account, a password reset link is on its way.'); } catch (err) { setError(err.message); } finally { setBusy(false); } };
  return <AuthShell title="Reset your password" subtitle="We’ll send a secure password reset link to your account email."><form className="auth-form" onSubmit={submit}><label>Email<input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></label>{error && <p className="auth-error">{error}</p>}{notice && <p className="auth-notice">{notice}</p>}<button className="auth-submit" disabled={busy}>{busy ? 'Sending…' : 'Send reset link'}</button><p className="auth-switch"><Link to="/login">Back to sign in</Link></p></form></AuthShell>;
}

export function ResetPassword() {
  const { session, resetPassword } = useAuth(); const navigate = useNavigate();
  const [password, setPassword] = useState(''); const [confirm, setConfirm] = useState(''); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  if (!session) return <Navigate to="/login" replace />;
  const submit = async (event) => { event.preventDefault(); if (password !== confirm) { setError('Passwords do not match.'); return; } setBusy(true); setError(''); try { await resetPassword(password); navigate('/', { replace: true }); } catch (err) { setError(err.message); } finally { setBusy(false); } };
  return <AuthShell title="Choose a new password" subtitle="Use at least eight characters for your new password."><form className="auth-form" onSubmit={submit}><label>New password<input type="password" autoComplete="new-password" minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} /></label><label>Confirm password<input type="password" autoComplete="new-password" minLength={8} required value={confirm} onChange={(event) => setConfirm(event.target.value)} /></label>{error && <p className="auth-error">{error}</p>}<button className="auth-submit" disabled={busy}>{busy ? 'Updating…' : 'Update password'}</button></form></AuthShell>;
}

export function AuthRequired({ children }) {
  const { session, loading, activeOrganizationId, organizations } = useAuth();
  if (loading) return <div className="auth-loading"><LoaderCircle className="auth-spin" /> Loading workspace…</div>;
  if (!session) return <Navigate to="/login" replace />;
  if (!organizations.length) return <Navigate to="/onboarding" replace />;
  if (!activeOrganizationId) return <Navigate to="/onboarding" replace />;
  return children;
}
