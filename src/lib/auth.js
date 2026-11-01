const legacySessionKey = 'berry.auth.session';
const activeOrgKey = 'berry.active.organization';
let currentSession = null;

// Remove bearer tokens written by older versions. Tokens now remain in HttpOnly server cookies.
try { localStorage.removeItem(legacySessionKey); } catch { /* Storage may be unavailable in restricted browsers. */ }

export const supabaseConfigured = Boolean(import.meta.env.VITE_API_BASE_URL || import.meta.env.DEV);
const apiBase = () => import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';
export const readSession = () => currentSession;
export const saveSession = (session) => { currentSession = session ? { user: session.user || session } : null; };
export const clearSession = () => {
  currentSession = null;
  try { localStorage.removeItem(legacySessionKey); } catch {}
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('berry:session-cleared'));
};
export const getActiveOrganizationId = () => localStorage.getItem(activeOrgKey);
export const setActiveOrganizationId = (id) => localStorage.setItem(activeOrgKey, id);

async function request(path, options = {}) {
  const response = await fetch(`${apiBase()}${path}`, { credentials: 'include', ...options });
  let result = {};
  try { result = await response.json(); } catch { /* Empty or non-JSON response. */ }
  if (!response.ok) throw new Error(result.message || 'The request could not be completed.');
  return result.data;
}

export async function authRequest(path, body) {
  const result = await request(`/auth/${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}) });
  if (result?.authenticated && result.user) saveSession({ user: result.user });
  return result;
}

export async function updateAuthPassword(password) {
  if (!currentSession?.user) throw new Error('Your password reset session has expired. Request a new reset link.');
  return request('/auth/password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) });
}

export async function refreshSession() {
  try {
    const result = await request('/auth/refresh', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    saveSession({ user: result.user });
    return result;
  } catch { clearSession(); return null; }
}

export async function apiRequest(path, { method = 'GET', body, rawBody, contentType, organizationId, headers: extraHeaders, retry = true } = {}) {
  const headers = { ...extraHeaders };
  if (contentType || (body !== undefined && rawBody === undefined)) headers['Content-Type'] = contentType || 'application/json';
  const orgId = organizationId ?? getActiveOrganizationId();
  if (orgId) headers['X-Organization-Id'] = orgId;
  try {
    return await request(path, { method, headers, body: rawBody ?? (body === undefined ? undefined : JSON.stringify(body)) });
  } catch (error) {
    if (retry && /session|sign in/i.test(error.message)) {
      const refreshed = await refreshSession();
      if (refreshed) return apiRequest(path, { method, body, rawBody, contentType, organizationId, headers: extraHeaders, retry: false });
    }
    throw error;
  }
}

export async function apiDownload(path) {
  const headers = {};
  const organizationId = getActiveOrganizationId();
  if (organizationId) headers['X-Organization-Id'] = organizationId;
  let response = await fetch(`${apiBase()}${path}`, { credentials: 'include', headers });
  if (response.status === 401) {
    const refreshed = await refreshSession();
    if (refreshed) response = await fetch(`${apiBase()}${path}`, { credentials: 'include', headers });
  }
  if (!response.ok) { let message = 'The download failed.'; try { message = (await response.json()).message || message; } catch {} throw new Error(message); }
  return response.blob();
}
