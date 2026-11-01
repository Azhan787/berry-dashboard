import test from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../src/app.js';
import { buildReportPdf } from '../src/services/invoicePdf.js';
import { errorHandler } from '../src/middleware/errors.js';

test('health and readiness endpoints report API and missing database configuration', async (t) => {
  const priorUrl = process.env.SUPABASE_URL;
  const priorKey = process.env.SUPABASE_PUBLISHABLE_KEY;
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_PUBLISHABLE_KEY;
  const server = app.listen(0);
  t.after(() => {
    server.close();
    if (priorUrl === undefined) delete process.env.SUPABASE_URL; else process.env.SUPABASE_URL = priorUrl;
    if (priorKey === undefined) delete process.env.SUPABASE_PUBLISHABLE_KEY; else process.env.SUPABASE_PUBLISHABLE_KEY = priorKey;
  });
  const { port } = server.address();
  const base = `http://127.0.0.1:${port}`;
  const health = await fetch(`${base}/health`);
  assert.equal(health.status, 200);
  assert.deepEqual(await health.json(), { success: true, data: { api: 'ok', supabaseConfigured: false } });
  const readiness = await fetch(`${base}/ready`);
  assert.equal(readiness.status, 503);
  assert.deepEqual((await readiness.json()).data, { ready: false, database: 'not_configured' });
});

test('catalogue and invoice APIs reject unauthenticated requests', async (t) => {
  const server = app.listen(0);
  t.after(() => server.close());
  const { port } = server.address();
  for (const path of ['/api/v1/products', '/api/v1/invoices']) {
    const response = await fetch(`http://127.0.0.1:${port}${path}`);
    assert.equal(response.status, 401, `${path} must require a valid session`);
    assert.equal((await response.json()).code, 'UNAUTHENTICATED');
  }
});

test('organization settings updates reject unauthenticated requests', async (t) => {
  const server = app.listen(0);
  t.after(() => server.close());
  const { port } = server.address();
  const response = await fetch(`http://127.0.0.1:${port}/api/v1/organization/settings`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:5173', 'X-Organization-Id': '00000000-0000-4000-8000-000000000001' },
    body: JSON.stringify({ name: 'Unauthorized update' }),
  });
  assert.equal(response.status, 401);
  assert.equal((await response.json()).code, 'UNAUTHENTICATED');
});

test('cookie-authenticated mutations reject untrusted or missing browser origins', async (t) => {
  const server = app.listen(0);
  t.after(() => server.close());
  const { port } = server.address();
  for (const origin of ['https://attacker.example', undefined]) {
    const response = await fetch(`http://127.0.0.1:${port}/api/v1/auth/logout`, { method: 'POST', headers: origin ? { Origin: origin } : {} });
    assert.equal(response.status, 403);
    assert.equal((await response.json()).code, 'CSRF_REJECTED');
  }
});

test('credentialed CORS reflects only the configured frontend origin', async (t) => {
  const server = app.listen(0);
  t.after(() => server.close());
  const { port } = server.address();
  const allowed = await fetch(`http://127.0.0.1:${port}/health`, { headers: { Origin: 'http://localhost:5173' } });
  assert.equal(allowed.headers.get('access-control-allow-origin'), 'http://localhost:5173');
  assert.equal(allowed.headers.get('access-control-allow-credentials'), 'true');
  const denied = await fetch(`http://127.0.0.1:${port}/health`, { headers: { Origin: 'https://attacker.example' } });
  assert.equal(denied.headers.get('access-control-allow-origin'), null);
});

test('server error logs do not include raw error text that could contain credentials', () => {
  const original = console.error;
  const captured = [];
  console.error = (...values) => captured.push(values.join(' '));
  try {
    const req = { method: 'POST', path: '/api/v1/auth/login' };
    const res = { status() { return this; }, json() {} };
    errorHandler(Object.assign(new Error('password=hidden access_token=hidden refresh_token=hidden cookie=hidden'), { status: 500 }), req, res, () => {});
  } finally { console.error = original; }
  assert.equal(captured.length, 1);
  assert.doesNotMatch(captured[0], /password=hidden|access_token=hidden|refresh_token=hidden|cookie=hidden/);
});

test('PDF report renderer returns a valid PDF for populated and empty data', async () => {
  for (const rows of [[{ name: 'Acme', status: 'active' }], []]) {
    const pdf = await buildReportPdf({ title: 'Customer report', organizationName: 'Berry workspace', columns: [{ key: 'name', label: 'Name' }, { key: 'status', label: 'Status' }], rows });
    assert.equal(pdf.subarray(0, 5).toString(), '%PDF-');
    assert.ok(pdf.length > 500);
  }
});
