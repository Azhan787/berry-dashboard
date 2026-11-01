import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { createAuthRouter } from '../src/routes/auth.js';
import { createRequireAuth } from '../src/middleware/auth.js';
import { clearSessionCookies, readCookie, setSessionCookies } from '../src/lib/authCookies.js';

const user = { id: 'user-1', email: 'person@example.com' };
const session = { access_token: 'access-token-test', refresh_token: 'refresh-token-test', expires_in: 3600, user };
const listen = async (router, t) => {
  const app = express(); app.use(express.json()); app.use('/api/v1/auth', router);
  const server = app.listen(0); t.after(() => server.close());
  return `http://127.0.0.1:${server.address().port}/api/v1/auth`;
};

test('auth API sets HttpOnly cookies and does not return token values', async (t) => {
  const base = await listen(createAuthRouter({ createClient: () => ({ auth: { signInWithPassword: async () => ({ data: { session, user }, error: null }) } }) }), t);
  const response = await fetch(`${base}/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: user.email, password: 'password123' }) });
  const result = await response.json();
  assert.equal(response.status, 200);
  assert.deepEqual(result.data, { user, authenticated: true });
  assert.equal(JSON.stringify(result).includes('access-token-test'), false);
  assert.equal(JSON.stringify(result).includes('refresh-token-test'), false);
  const cookies = response.headers.getSetCookie();
  assert.equal(cookies.length, 2);
  assert.ok(cookies.every((cookie) => /HttpOnly/i.test(cookie) && /SameSite=Lax/i.test(cookie) && /Path=\/api/i.test(cookie)));
});

test('auth API signup preserves confirmation redirect and supports email confirmation pending', async (t) => {
  let signupInput;
  const base = await listen(createAuthRouter({ createClient: () => ({ auth: { signUp: async (input) => { signupInput = input; return { data: { session: null, user }, error: null }; } } }) }), t);
  const response = await fetch(`${base}/signup`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: user.email, password: 'password123', full_name: 'Person', return_to: '/invite?token=abc' }) });
  assert.equal(response.status, 201);
  assert.deepEqual((await response.json()).data, { user, authenticated: false });
  assert.equal(new URL(signupInput.options.emailRedirectTo).searchParams.get('returnTo'), '/invite?token=abc');
});

test('auth callback exchanges the Supabase redirect session for cookies without echoing either token', async (t) => {
  let received;
  const base = await listen(createAuthRouter({ createClient: () => ({ auth: { setSession: async (tokens) => { received = tokens; return { data: { session, user }, error: null }; } } }) }), t);
  const response = await fetch(`${base}/session`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ access_token: 'callback-access', refresh_token: 'callback-refresh' }) });
  assert.equal(response.status, 200);
  assert.equal(received.access_token, 'callback-access');
  assert.equal(received.refresh_token, 'callback-refresh');
  const body = JSON.stringify(await response.json());
  assert.equal(body.includes('callback-access'), false);
  assert.equal(body.includes('callback-refresh'), false);
  assert.equal(response.headers.getSetCookie().length, 2);
});

test('password recovery keeps the existing callback route and returns no account disclosure', async (t) => {
  let recovery;
  const base = await listen(createAuthRouter({ createClient: () => ({ auth: { resetPasswordForEmail: async (email, options) => { recovery = { email, options }; return { error: null }; } } }) }), t);
  const response = await fetch(`${base}/recover`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: user.email }) });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { success: true, data: { accepted: true } });
  assert.equal(recovery.email, user.email);
  assert.equal(new URL(recovery.options.redirectTo).pathname, '/auth/callback');
  assert.equal(new URL(recovery.options.redirectTo).searchParams.get('returnTo'), '/reset-password');
});

test('auth refresh rotates cookies and logout clears cookies and revokes only this Supabase session', async (t) => {
  const calls = [];
  const base = await listen(createAuthRouter({
    createClient: () => ({ auth: { refreshSession: async ({ refresh_token }) => ({ data: { session: { ...session, access_token: `next-${refresh_token}` }, user }, error: null }) } }),
    fetchImpl: async (url, options) => { calls.push({ url, options }); return new Response(null, { status: 204 }); },
  }), t);
  const refresh = await fetch(`${base}/refresh`, { method: 'POST', headers: { Cookie: 'berry_refresh_token=refresh-cookie' } });
  assert.equal(refresh.status, 200);
  assert.match(refresh.headers.getSetCookie().join(';'), /berry_access_token=next-refresh-cookie/);
  const logout = await fetch(`${base}/logout`, { method: 'POST', headers: { Cookie: 'berry_access_token=access-cookie; berry_refresh_token=refresh-cookie' } });
  assert.equal(logout.status, 200);
  assert.ok(logout.headers.getSetCookie().every((cookie) => /Max-Age=0/.test(cookie)));
  assert.match(calls[0].url, /scope=local/);
  assert.equal(calls[0].options.headers.Authorization, 'Bearer next-refresh-cookie');
});

test('auth refresh clears expired cookies and returns unauthorized for invalid refresh token', async (t) => {
  const base = await listen(createAuthRouter({ createClient: () => ({ auth: { refreshSession: async () => ({ data: { session: null, user: null }, error: new Error('invalid refresh token') }) } }) }), t);
  const response = await fetch(`${base}/refresh`, { method: 'POST', headers: { Cookie: 'berry_refresh_token=expired' } });
  assert.equal(response.status, 401);
  assert.equal((await response.json()).code, 'UNAUTHENTICATED');
  assert.ok(response.headers.getSetCookie().every((cookie) => /Max-Age=0/.test(cookie)));
});

test('requireAuth refreshes expired access cookies and ignores bearer tokens', async () => {
  let checked = null;
  const middleware = createRequireAuth({
    getUser: async (token) => ({ data: { user: token === 'expired' ? null : user }, error: token === 'expired' ? new Error('expired') : null }),
    refresh: async (refreshToken) => ({ data: { session: { access_token: `new-${refreshToken}`, refresh_token: 'rotated', expires_in: 60 }, user }, error: null }),
    makeUserClient: (token) => ({ token }),
  });
  const req = { method: 'PATCH', headers: { cookie: 'berry_access_token=expired; berry_refresh_token=refresh-me', authorization: 'Bearer ignored-token' } };
  const res = { headers: [], append(name, value) { this.headers.push([name, value]); }, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
  await middleware(req, res, () => { checked = req; });
  assert.ok(checked);
  assert.equal(req.token, 'new-refresh-me');
  assert.equal(req.supabase.token, 'new-refresh-me');
  assert.ok(res.headers.some(([, cookie]) => cookie.includes('berry_access_token=new-refresh-me')));

  const deniedReq = { method: 'GET', headers: { authorization: 'Bearer ignored-token' } };
  const deniedRes = { status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
  await middleware(deniedReq, deniedRes, () => assert.fail('Bearer-only request must not authenticate'));
  assert.equal(deniedRes.statusCode, 401);
});

test('GET authorization does not rotate refresh cookies outside the CSRF-checked POST refresh flow', async () => {
  let refreshAttempts = 0;
  const middleware = createRequireAuth({ getUser: async () => ({ data: { user: null }, error: new Error('expired') }), refresh: async () => { refreshAttempts += 1; throw new Error('must use explicit refresh route'); } });
  const req = { method: 'GET', headers: { cookie: 'berry_access_token=expired; berry_refresh_token=preserve-me' } };
  const res = { headers: [], append(name, value) { this.headers.push([name, value]); }, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
  await middleware(req, res, () => assert.fail('Expired GET must return unauthorized'));
  assert.equal(res.statusCode, 401);
  assert.equal(refreshAttempts, 0);
  assert.equal(res.headers.length, 0);
});

test('password recovery endpoint rate-limits repeated requests', async (t) => {
  let providerCalls = 0;
  const base = await listen(createAuthRouter({ createClient: () => ({ auth: { resetPasswordForEmail: async () => { providerCalls += 1; return { error: null }; } } }) }), t);
  const statuses = [];
  for (let i = 0; i < 6; i += 1) {
    const response = await fetch(`${base}/recover`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: user.email }) });
    statuses.push(response.status);
  }
  assert.deepEqual(statuses, [200, 200, 200, 200, 200, 429]);
  assert.equal(providerCalls, 5);
});

test('cookie parser handles encoded values and cookie clear helper expires both tokens', () => {
  assert.equal(readCookie({ headers: { cookie: 'other=x; berry_access_token=a%2Bb' } }, 'berry_access_token'), 'a+b');
  const res = { cookies: [], append(name, value) { this.cookies.push(value); } };
  clearSessionCookies(res);
  assert.equal(res.cookies.length, 2);
  assert.ok(res.cookies.every((cookie) => /Max-Age=0/.test(cookie) && /HttpOnly/.test(cookie)));
  const secureRes = { cookies: [], append(_name, value) { this.cookies.push(value); } };
  const before = process.env.NODE_ENV; process.env.NODE_ENV = 'production';
  try { setSessionCookies(secureRes, session); } finally { if (before === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = before; }
  assert.ok(secureRes.cookies.every((cookie) => /; Secure/.test(cookie)));
});
