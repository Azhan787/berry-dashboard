import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { publicClient } from '../config/supabase.js';
import { clearSessionCookies, readCookie, setSessionCookies } from '../lib/authCookies.js';
import { requireAuth } from '../middleware/auth.js';

const emailSchema = z.string().trim().email().max(254);
const passwordSchema = z.string().min(8).max(128);
const authError = (error) => {
  const status = Number(error?.status) || 401;
  const result = new Error(status >= 500 ? 'The authentication service is temporarily unavailable.' : error?.message || 'Authentication failed.');
  result.status = status >= 500 ? 503 : status === 401 ? 401 : 400;
  return result;
};

export function createAuthRouter({ createClient = publicClient, fetchImpl = fetch } = {}) {
const router = Router();
const authLimit = (limit, windowMs) => rateLimit({ windowMs, limit, standardHeaders: 'draft-8', legacyHeaders: false, handler: (_req, res) => res.status(429).json({ success: false, code: 'RATE_LIMITED', message: 'Too many authentication attempts. Please wait and try again.' }) });
const loginLimit = authLimit(10, 15 * 60_000);
const signupLimit = authLimit(5, 60 * 60_000);
const recoveryLimit = authLimit(5, 60 * 60_000);
const sessionLimit = authLimit(20, 15 * 60_000);
const refreshLimit = authLimit(30, 60_000);
const passwordLimit = authLimit(10, 15 * 60_000);
const logoutLimit = authLimit(30, 60_000);
router.post('/login', loginLimit, async (req, res, next) => {
  try {
    const input = z.object({ email: emailSchema, password: z.string().min(1).max(128) }).strict().parse(req.body);
    const { data, error } = await createClient().auth.signInWithPassword(input);
    if (error || !data.session || !data.user) throw authError(error);
    setSessionCookies(res, data.session);
    res.json({ success: true, data: { user: { id: data.user.id, email: data.user.email }, authenticated: true } });
  } catch (error) { next(error); }
});

router.post('/signup', signupLimit, async (req, res, next) => {
  try {
    const input = z.object({ email: emailSchema, password: passwordSchema, full_name: z.string().trim().min(1).max(120), return_to: z.string().max(500).optional() }).strict().parse(req.body);
    const callbackUrl = new URL('/auth/callback', process.env.CLIENT_URL || 'http://localhost:5173');
    if (input.return_to?.startsWith('/') && !input.return_to.startsWith('//')) callbackUrl.searchParams.set('returnTo', input.return_to);
    const callback = callbackUrl.toString();
    const { data, error } = await createClient().auth.signUp({ email: input.email, password: input.password, options: { emailRedirectTo: callback, data: { full_name: input.full_name } } });
    if (error || !data.user) throw authError(error);
    if (data.session) setSessionCookies(res, data.session);
    res.status(201).json({ success: true, data: { user: { id: data.user.id, email: data.user.email }, authenticated: Boolean(data.session) } });
  } catch (error) { next(error); }
});

router.post('/recover', recoveryLimit, async (req, res, next) => {
  try {
    const input = z.object({ email: emailSchema }).strict().parse(req.body);
    const callback = new URL('/auth/callback?returnTo=%2Freset-password', process.env.CLIENT_URL || 'http://localhost:5173').toString();
    const { error } = await createClient().auth.resetPasswordForEmail(input.email, { redirectTo: callback });
    if (error) throw authError(error);
    res.json({ success: true, data: { accepted: true } });
  } catch (error) { next(error); }
});

router.post('/session', sessionLimit, async (req, res, next) => {
  try {
    const input = z.object({ access_token: z.string().min(1).max(8192), refresh_token: z.string().min(1).max(2048) }).strict().parse(req.body);
    const client = createClient();
    const { data, error } = await client.auth.setSession(input);
    if (error || !data.session || !data.user) throw authError(error);
    setSessionCookies(res, data.session);
    res.json({ success: true, data: { user: { id: data.user.id, email: data.user.email }, authenticated: true } });
  } catch (error) { next(error); }
});

router.post('/refresh', refreshLimit, async (req, res, next) => {
  try {
    const refreshToken = readCookie(req, 'berry_refresh_token');
    if (!refreshToken) {
      clearSessionCookies(res);
      return res.status(401).json({ success: false, code: 'UNAUTHENTICATED', message: 'Your session has expired. Sign in again.' });
    }
    const { data, error } = await createClient().auth.refreshSession({ refresh_token: refreshToken });
    if (error || !data.session || !data.user) {
      clearSessionCookies(res);
      return res.status(401).json({ success: false, code: 'UNAUTHENTICATED', message: 'Your session has expired. Sign in again.' });
    }
    setSessionCookies(res, data.session);
    res.json({ success: true, data: { user: { id: data.user.id, email: data.user.email }, authenticated: true } });
  } catch (error) { next(error); }
});

router.post('/logout', logoutLimit, async (req, res) => {
  let accessToken = readCookie(req, 'berry_access_token');
  const refreshToken = readCookie(req, 'berry_refresh_token');
  clearSessionCookies(res);
  if (refreshToken) {
    try {
      const { data } = await createClient().auth.refreshSession({ refresh_token: refreshToken });
      if (data?.session?.access_token) accessToken = data.session.access_token;
    } catch { /* Try revocation with the existing access token when refresh is unavailable. */ }
  }
  if (accessToken) {
    const url = `${process.env.SUPABASE_URL}/auth/v1/logout?scope=local`;
    try {
      const response = await fetchImpl(url, { method: 'POST', headers: { apikey: process.env.SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${accessToken}` } });
      if (!response.ok) return res.status(502).json({ success: false, code: 'SIGNOUT_PARTIAL', message: 'This browser was signed out, but Supabase could not revoke the session. Please try again.' });
    } catch { return res.status(502).json({ success: false, code: 'SIGNOUT_PARTIAL', message: 'This browser was signed out, but Supabase could not revoke the session. Please try again.' }); }
  }
  res.json({ success: true, data: { signedOut: true } });
});

router.post('/password', passwordLimit, requireAuth, async (req, res, next) => {
  try {
    const { password } = z.object({ password: passwordSchema }).strict().parse(req.body);
    const response = await fetchImpl(`${process.env.SUPABASE_URL}/auth/v1/user`, { method: 'PUT', headers: { 'Content-Type': 'application/json', apikey: process.env.SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${req.token}` }, body: JSON.stringify({ password }) });
    const result = await response.json();
    if (!response.ok) return res.status(response.status === 401 ? 401 : 400).json({ success: false, code: 'AUTH_UPDATE_FAILED', message: result.msg || result.message || 'Password update failed.' });
    res.json({ success: true, data: { updated: true } });
  } catch (error) { next(error); }
});

router.get('/session', requireAuth, (req, res) => res.json({ success: true, data: { id: req.user.id, email: req.user.email } }));

return router;
}

export default createAuthRouter();
