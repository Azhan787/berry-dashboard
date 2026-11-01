import { userClient } from '../config/supabase.js';
import { publicClient } from '../config/supabase.js';
import { readCookie, setSessionCookies, clearSessionCookies } from '../lib/authCookies.js';

export function createRequireAuth({ getUser = async (token) => userClient(token).auth.getUser(token), refresh = async (token) => publicClient().auth.refreshSession({ refresh_token: token }), makeUserClient = userClient } = {}) {
  return async function requireAuth(req, res, next) {
    try {
      let token = readCookie(req, 'berry_access_token');
      const refreshToken = readCookie(req, 'berry_refresh_token');
      let result = token ? await getUser(token) : { data: { user: null }, error: true };
      const mayRotateCookie = !['GET', 'HEAD'].includes(req.method);
      if ((!result.data?.user || result.error) && refreshToken && mayRotateCookie) {
        const refreshed = await refresh(refreshToken);
        if (!refreshed.error && refreshed.data?.session?.access_token && refreshed.data?.user) {
          token = refreshed.data.session.access_token;
          result = { data: { user: refreshed.data.user }, error: null };
          setSessionCookies(res, refreshed.data.session);
        } else {
          clearSessionCookies(res);
        }
      }
      if (!token || result.error || !result.data?.user) {
        if (mayRotateCookie && (readCookie(req, 'berry_access_token') || refreshToken)) clearSessionCookies(res);
        return res.status(401).json({ success: false, code: 'UNAUTHENTICATED', message: 'Your session is invalid or expired.' });
      }
      req.supabase = makeUserClient(token);
      req.user = result.data.user;
      req.token = token;
      next();
    } catch (error) { next(error); }
  };
}

export const requireAuth = createRequireAuth();

export async function requireOrganization(req, res, next) {
  try {
    const organizationId = req.headers['x-organization-id'];
    if (!organizationId) return res.status(400).json({ success: false, code: 'ORGANIZATION_REQUIRED', message: 'Select a workspace first.' });
    const { data, error } = await req.supabase.from('organization_memberships')
      .select('organization_id, role, status').eq('organization_id', organizationId).eq('user_id', req.user.id).eq('status', 'active').maybeSingle();
    if (error) throw error;
    if (!data || data.role === 'client') return res.status(403).json({ success: false, code: 'FORBIDDEN', message: 'You are not permitted to use this organization workspace.' });
    req.organization = { id: data.organization_id, role: data.role };
    next();
  } catch (error) { next(error); }
}

export function requireOrgRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.organization?.role)) return res.status(403).json({ success: false, code: 'FORBIDDEN', message: 'Your workspace role cannot perform this action.' });
    next();
  };
}
