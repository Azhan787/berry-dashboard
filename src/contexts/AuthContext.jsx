import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { apiRequest, authRequest, clearSession, getActiveOrganizationId, readSession, saveSession, setActiveOrganizationId, supabaseConfigured, updateAuthPassword } from '../lib/auth';
import { AuthContext } from './AuthContextValue';

export function AuthProvider({ children }) {
  const [session, setSession] = useState(readSession);
  const [organizations, setOrganizations] = useState([]);
  const [activeOrganizationId, setActiveOrganizationIdState] = useState(getActiveOrganizationId);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleSessionCleared = () => { setSession(null); setOrganizations([]); setActiveOrganizationIdState(null); };
    window.addEventListener('berry:session-cleared', handleSessionCleared);
    return () => window.removeEventListener('berry:session-cleared', handleSessionCleared);
  }, []);

  const loadOrganizations = useCallback(async () => {
    if (!readSession()) { setOrganizations([]); setActiveOrganizationIdState(null); return []; }
    try {
      const workspaces = await apiRequest('/organizations');
      setOrganizations(workspaces);
      const saved = getActiveOrganizationId();
      const selected = workspaces.some((item) => item.id === saved) ? saved : workspaces[0]?.id || null;
      if (selected) setActiveOrganizationId(selected);
      else localStorage.removeItem('berry.active.organization');
      setActiveOrganizationIdState(selected);
      return workspaces;
    } catch { setOrganizations([]); return []; }
  }, []);

  useEffect(() => {
    let alive = true;
    const init = async () => {
      try {
        const identity = await apiRequest('/auth/session');
        if (!alive) return;
        const current = { user: identity };
        saveSession(current);
        setSession(current);
        await loadOrganizations();
      } catch { clearSession(); if (alive) setSession(null); }
      if (alive) setLoading(false);
    };
    init();
    return () => { alive = false; };
  }, [loadOrganizations]);

  const login = useCallback(async (email, password) => {
    const next = await authRequest('login', { email, password });
    const authenticated = { user: next.user };
    saveSession(authenticated); setSession(authenticated); await loadOrganizations(); return authenticated;
  }, [loadOrganizations]);
  const signup = useCallback(async (email, password, fullName) => {
    const returnTo = new URLSearchParams(window.location.search).get('returnTo');
    const safeReturnTo = returnTo?.startsWith('/') && !returnTo.startsWith('//') ? returnTo : undefined;
    const next = await authRequest('signup', { email, password, full_name: fullName, return_to: safeReturnTo });
    if (next.authenticated) { const authenticated = { user: next.user }; saveSession(authenticated); setSession(authenticated); await loadOrganizations(); }
    return next;
  }, [loadOrganizations]);
  const logout = useCallback(async () => {
    try { await authRequest('logout', {}); } catch { /* Local sign-out still clears the browser session when remote revocation is unavailable. */ }
    finally { clearSession(); localStorage.removeItem('berry.active.organization'); setSession(null); setOrganizations([]); setActiveOrganizationIdState(null); }
  }, []);
  const chooseOrganization = useCallback((id) => { setActiveOrganizationId(id); setActiveOrganizationIdState(id); }, []);
  const createOrganization = useCallback(async (data) => { const created = await apiRequest('/organizations', { method: 'POST', body: data }); await loadOrganizations(); chooseOrganization(created.id); return created; }, [loadOrganizations, chooseOrganization]);
  const adoptSession = useCallback(async (next) => { const result = await authRequest('session', { access_token: next.access_token, refresh_token: next.refresh_token }); const authenticated = { user: result.user }; saveSession(authenticated); setSession(authenticated); await loadOrganizations(); }, [loadOrganizations]);
  const resetPassword = useCallback((password) => updateAuthPassword(password), []);

  const value = useMemo(() => ({ session, user: session?.user, organizations, activeOrganizationId, loading, login, signup, logout, chooseOrganization, createOrganization, refreshOrganizations: loadOrganizations, adoptSession, resetPassword, configured: supabaseConfigured }), [session, organizations, activeOrganizationId, loading, login, signup, logout, chooseOrganization, createOrganization, loadOrganizations, adoptSession, resetPassword]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
