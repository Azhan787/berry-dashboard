import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('invoice year correction migration preserves the RPC contract and removes the PL/pgSQL name conflict', async () => {
  const sql = await readFile(new URL('../../supabase/migrations/202611010002_fix_invoice_year_ambiguity.sql', import.meta.url), 'utf8');
  const functionStart = sql.indexOf('create or replace function public.create_invoice_draft(');
  assert.notEqual(functionStart, -1);
  const functionSql = sql.slice(functionStart);

  assert.match(functionSql, /org_id uuid,\s*customer_id uuid,\s*invoice_currency text,\s*invoice_issue_date date,\s*invoice_due_date date,\s*line_items jsonb,\s*discount numeric default 0,\s*tax numeric default 0,\s*invoice_notes text default null,\s*invoice_terms text default null/i);
  assert.match(functionSql, /returns public\.invoices\s+language plpgsql\s+security definer\s+set search_path = ''/i);
  assert.match(functionSql, /v_invoice_year integer/);
  assert.match(functionSql, /v_invoice_year := extract\(year from invoice_issue_date\)::integer/);
  assert.match(functionSql, /values \(org_id, v_invoice_year, 1\)/i);
  assert.match(functionSql, /on conflict \(organization_id, invoice_year\)/i);
  assert.match(functionSql, /format\('INV-%s-%s', v_invoice_year,/i);
  assert.match(functionSql, /returning invoice_sequence\.last_number into seq/i);
  assert.doesNotMatch(functionSql, /\binvoice_year\s+integer\s*;/i);
  assert.doesNotMatch(functionSql, /values\s*\(org_id,\s*invoice_year\s*,/i);
});
