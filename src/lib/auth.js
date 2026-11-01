const sessionKey = 'berry.auth.session';
const activeOrgKey = 'berry.active.organization';

export const supabaseConfigured = Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);
export const readSession = () => { try { return JSON.parse(localStorage.getItem(sessionKey) || 'null'); } catch { return null; } };
export const saveSession = (session) => localStorage.setItem(sessionKey, JSON.stringify(session));
export const clearSession = () => localStorage.removeItem(sessionKey);
export const getActiveOrganizationId = () => localStorage.getItem(activeOrgKey);
export const setActiveOrganizationId = (id) => localStorage.setItem(activeOrgKey, id);

export async function authRequest(path, body) {
  if (!supabaseConfigured) throw new Error('Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to .env to enable authentication.');
  const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/auth/v1/${path}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY }, body: JSON.stringify(body),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.msg || result.message || 'Authentication failed.');
  return result;
}

export async function updateAuthPassword(password) {
  const session = readSession();
  if (!session?.access_token || !supabaseConfigured) throw new Error('Your password reset session has expired. Request a new reset link.');
  const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/auth/v1/user`, { method: 'PUT', headers: { 'Content-Type': 'application/json', apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify({ password }) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.msg || result.message || 'Password update failed.');
  return result;
}

export async function refreshSession(session) {
  if (!session?.refresh_token) return null;
  try {
    const next = await authRequest('token?grant_type=refresh_token', { refresh_token: session.refresh_token });
    saveSession(next);
    return next;
  } catch { clearSession(); return null; }
}

export async function apiRequest(path, { method = 'GET', body, rawBody, contentType, organizationId, headers: extraHeaders, retry = true } = {}) {
  const session = readSession();
  const headers = { 'Content-Type': contentType || 'application/json', ...extraHeaders };
  if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
  const orgId = organizationId ?? getActiveOrganizationId();
  if (orgId) headers['X-Organization-Id'] = orgId;
  const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1'}${path}`, { method, headers, body: rawBody ?? (body ? JSON.stringify(body) : undefined) });
  if (response.status === 401 && retry && session?.refresh_token) {
    const next = await refreshSession(session);
    if (next) return apiRequest(path, { method, body, rawBody, contentType, organizationId, headers: extraHeaders, retry: false });
  }
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || 'The request could not be completed.');
  return result.data;
}

export async function apiDownload(path) {
  const session = readSession(); const organizationId = getActiveOrganizationId();
  const headers = { Authorization: `Bearer ${session?.access_token || ''}`, 'X-Organization-Id': organizationId || '' };
  let response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1'}${path}`, { headers });
  if (response.status === 401 && session?.refresh_token) { const next = await refreshSession(session); if (next) response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1'}${path}`, { headers: { ...headers, Authorization: `Bearer ${next.access_token}` } }); }
  if (!response.ok) { let message = 'The download failed.'; try { message = (await response.json()).message || message; } catch {} throw new Error(message); }
  return response.blob();
}
