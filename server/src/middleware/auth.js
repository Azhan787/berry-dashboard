import { userClient } from '../config/supabase.js';

export async function requireAuth(req, res, next) {
  try {
    const token = req.headers.authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
    if (!token) return res.status(401).json({ success: false, code: 'UNAUTHENTICATED', message: 'Sign in to continue.' });
    const supabase = userClient(token);
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) return res.status(401).json({ success: false, code: 'UNAUTHENTICATED', message: 'Your session is invalid or expired.' });
    req.supabase = supabase;
    req.user = data.user;
    req.token = token;
    next();
  } catch (error) { next(error); }
}

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
