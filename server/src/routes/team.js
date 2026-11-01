import { Router } from 'express';
import crypto from 'node:crypto';
import { z } from 'zod';
import { requireAuth, requireOrganization, requireOrgRole } from '../middleware/auth.js';
import { buildInvitationEmail, emailProviderConfigured, sendEmail } from '../services/emailService.js';

const router = Router({ mergeParams: true });
const wrap = (handler) => (req, res, next) => Promise.resolve(handler(req, res)).catch(next);
const paramsMatchWorkspace = (req, res, next) => req.params.organizationId === req.organization.id ? next() : res.status(403).json({ success: false, code: 'FORBIDDEN', message: 'The requested organization is not your selected workspace.' });

router.use(requireAuth, requireOrganization, paramsMatchWorkspace);

router.get('/members', requireOrgRole('owner', 'admin'), wrap(async (req, res) => {
  const { data: memberships, error } = await req.supabase.from('organization_memberships').select('user_id,role,status,joined_at,created_at').eq('organization_id', req.organization.id).order('created_at');
  if (error) throw error;
  const userIds = (memberships || []).map((membership) => membership.user_id);
  const { data: profiles, error: profileError } = userIds.length ? await req.supabase.from('profiles').select('id,full_name,email,avatar_url').in('id', userIds) : { data: [], error: null };
  if (profileError) throw profileError;
  const byId = new Map((profiles || []).map((profile) => [profile.id, profile]));
  res.json({ success: true, data: (memberships || []).map((membership) => ({ ...membership, profile: byId.get(membership.user_id) || null })) });
}));

router.get('/invitations', requireOrgRole('owner', 'admin'), wrap(async (req, res) => {
  const { data, error } = await req.supabase.from('organization_invitations').select('id,email,role,expires_at,accepted_at,revoked_at,created_at').eq('organization_id', req.organization.id).order('created_at', { ascending: false });
  if (error) throw error;
  res.json({ success: true, data: data || [] });
}));

router.post('/invitations', requireOrgRole('owner', 'admin'), wrap(async (req, res) => {
  const input = z.object({ email: z.string().trim().email().max(254), role: z.enum(['admin', 'manager', 'member', 'viewer']) }).strict().parse(req.body);
  if (!emailProviderConfigured()) return res.status(503).json({ success: false, code: 'EMAIL_NOT_CONFIGURED', message: 'Email invitations are disabled until a provider is configured.' });
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const { data: organization, error: organizationError } = await req.supabase.from('organizations').select('name').eq('id', req.organization.id).single();
  if (organizationError) throw organizationError;
  const { data: invitation, error } = await req.supabase.rpc('create_org_invitation', { org_id: req.organization.id, invite_email: input.email.toLowerCase(), invite_role: input.role, token_hash: tokenHash });
  if (error) throw error;
  const invitationRow = Array.isArray(invitation) ? invitation[0] : invitation;
  const appUrl = process.env.APP_BASE_URL || process.env.CLIENT_URL || 'http://localhost:5173';
  const inviteUrl = new URL('/accept-invite', appUrl);
  inviteUrl.hash = new URLSearchParams({ organizationId: req.organization.id, token }).toString();
  const email = buildInvitationEmail({ organizationName: organization.name, role: input.role, inviteUrl: inviteUrl.toString() });
  try {
    await sendEmail({ to: input.email, ...email, idempotencyKey: `berry-invitation/${invitationRow.id}` });
  } catch (sendError) {
    await req.supabase.rpc('revoke_org_invitation', { org_id: req.organization.id, invitation_id: invitationRow.id });
    throw sendError;
  }
  res.status(201).json({ success: true, data: { id: invitationRow.id, email: invitationRow.email, role: invitationRow.role, expires_at: invitationRow.expires_at }, message: 'Invitation email sent.' });
}));

router.delete('/invitations/:invitationId', requireOrgRole('owner', 'admin'), wrap(async (req, res) => {
  const id = z.string().uuid().parse(req.params.invitationId);
  const { error } = await req.supabase.rpc('revoke_org_invitation', { org_id: req.organization.id, invitation_id: id });
  if (error) throw error;
  res.json({ success: true, data: { id } });
}));

router.patch('/members/:userId', requireOrgRole('owner', 'admin'), wrap(async (req, res) => {
  const userId = z.string().uuid().parse(req.params.userId);
  const input = z.object({ role: z.enum(['admin', 'manager', 'member', 'viewer']), status: z.enum(['active', 'suspended']) }).strict().parse(req.body);
  const { data, error } = await req.supabase.rpc('set_org_member', { org_id: req.organization.id, target_user: userId, new_role: input.role, new_status: input.status });
  if (error) throw error;
  res.json({ success: true, data: Array.isArray(data) ? data[0] : data });
}));

router.delete('/members/:userId', requireOrgRole('owner', 'admin'), wrap(async (req, res) => {
  const userId = z.string().uuid().parse(req.params.userId);
  const { error } = await req.supabase.rpc('remove_org_member', { org_id: req.organization.id, target_user: userId });
  if (error) throw error;
  res.json({ success: true, data: { user_id: userId } });
}));

export default router;
