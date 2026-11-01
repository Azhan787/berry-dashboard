import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { apiRequest, authRequest, clearSession, getActiveOrganizationId, readSession, saveSession, setActiveOrganizationId, supabaseConfigured, updateAuthPassword } from '../lib/auth';
import { AuthContext } from './AuthContextValue';

export function AuthProvider({ children }) {
  const [session, setSession] = useState(readSession);
  const [organizations, setOrganizations] = useState([]);
  const [activeOrganizationId, setActiveOrganizationIdState] = useState(getActiveOrganizationId);
  const [loading, setLoading] = useState(Boolean(readSession()));

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
      const current = readSession();
      if (!current) { setLoading(false); return; }
      try {
        const identity = await apiRequest('/auth/session');
        if (!alive) return;
        setSession({ ...current, user: identity });
        await loadOrganizations();
      } catch { clearSession(); if (alive) setSession(null); }
      if (alive) setLoading(false);
    };
    init();
    return () => { alive = false; };
  }, [loadOrganizations]);

  const login = useCallback(async (email, password) => {
    const next = await authRequest('token?grant_type=password', { email, password });
    saveSession(next); setSession(next); await loadOrganizations(); return next;
  }, [loadOrganizations]);
  const signup = useCallback(async (email, password, fullName) => {
    const callback = new URL('/auth/callback', window.location.origin);
    const returnTo = new URLSearchParams(window.location.search).get('returnTo');
    if (returnTo?.startsWith('/') && !returnTo.startsWith('//')) callback.searchParams.set('returnTo', returnTo);
    const next = await authRequest(`signup?redirect_to=${encodeURIComponent(callback.toString())}`, { email, password, data: { full_name: fullName } });
    if (next.access_token) { saveSession(next); setSession(next); await loadOrganizations(); }
    return next;
  }, [loadOrganizations]);
  const logout = useCallback(() => {
    const current = readSession();
    if (current?.access_token && supabaseConfigured) void fetch(`${import.meta.env.VITE_SUPABASE_URL}/auth/v1/logout`, { method: 'POST', headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${current.access_token}` } }).catch(() => {});
    clearSession(); localStorage.removeItem('berry.active.organization'); setSession(null); setOrganizations([]); setActiveOrganizationIdState(null);
  }, []);
  const chooseOrganization = useCallback((id) => { setActiveOrganizationId(id); setActiveOrganizationIdState(id); }, []);
  const createOrganization = useCallback(async (data) => { const created = await apiRequest('/organizations', { method: 'POST', body: data }); await loadOrganizations(); chooseOrganization(created.id); return created; }, [loadOrganizations, chooseOrganization]);
  const adoptSession = useCallback(async (next) => { saveSession(next); setSession(next); const identity = await apiRequest('/auth/session'); setSession({ ...next, user: identity }); await loadOrganizations(); }, [loadOrganizations]);
  const resetPassword = useCallback((password) => updateAuthPassword(password), []);

  const value = useMemo(() => ({ session, user: session?.user, organizations, activeOrganizationId, loading, login, signup, logout, chooseOrganization, createOrganization, refreshOrganizations: loadOrganizations, adoptSession, resetPassword, configured: supabaseConfigured }), [session, organizations, activeOrganizationId, loading, login, signup, logout, chooseOrganization, createOrganization, loadOrganizations, adoptSession, resetPassword]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
