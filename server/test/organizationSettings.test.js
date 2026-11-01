import test from 'node:test';
import assert from 'node:assert/strict';
import { buildOrganizationSettingsPayload, normalizeOrganizationSettings, validateOrganizationWebsite } from '../../shared/organizationSettings.js';
import { getOrganizationSettings, organizationSettingsSchema, saveOrganizationSettings } from '../src/services/organizationSettings.js';
import { requireOrgRole } from '../src/middleware/auth.js';

const validSettings = {
  name: 'Berry Workspace',
  website: 'https://example.com',
  industry: 'Technology',
  company_size: '11-50',
  default_currency: 'USD',
  timezone: 'UTC',
  locale: 'en',
};

test('website accepts a valid URL and an empty value, and normalizes database null', () => {
  assert.equal(organizationSettingsSchema.parse(validSettings).website, 'https://example.com');
  assert.equal(organizationSettingsSchema.parse({ ...validSettings, website: '' }).website, '');
  assert.equal(organizationSettingsSchema.parse({ ...validSettings, website: null }).website, '');
  assert.equal(validateOrganizationWebsite('https://example.com'), '');
  assert.equal(validateOrganizationWebsite(''), '');
  assert.match(validateOrganizationWebsite('not a URL'), /valid website URL/);
  assert.throws(() => organizationSettingsSchema.parse({ ...validSettings, website: 'not a URL' }));
});

test('nullable and empty company size values normalize, while a selected value is preserved', () => {
  assert.equal(organizationSettingsSchema.parse({ ...validSettings, company_size: null }).company_size, '');
  assert.equal(organizationSettingsSchema.parse({ ...validSettings, company_size: '' }).company_size, '');
  assert.equal(organizationSettingsSchema.parse({ ...validSettings, company_size: '51-200' }).company_size, '51-200');
});

test('form initialization normalizes null organization fields into controlled input strings', () => {
  const form = normalizeOrganizationSettings({ ...validSettings, website: null, industry: null, company_size: null });
  assert.deepEqual(form, { ...validSettings, website: '', industry: '', company_size: '' });
  assert.equal(Object.values(form).some((value) => value === null), false);
});

test('payload allowlist omits organization id and permits clearing optional fields', () => {
  const payload = buildOrganizationSettingsPayload({ ...validSettings, id: 'client-selected-id', website: '', company_size: '' });
  assert.equal(Object.hasOwn(payload, 'id'), false);
  assert.equal(payload.website, '');
  assert.equal(payload.company_size, '');
  assert.deepEqual(Object.keys(payload).sort(), ['company_size', 'default_currency', 'industry', 'locale', 'name', 'timezone', 'website']);
  assert.doesNotThrow(() => organizationSettingsSchema.parse(payload));
  assert.throws(() => organizationSettingsSchema.parse({ ...payload, id: 'client-selected-id' }));
});

test('organization read and update operations persist optional values using the authorized organization id', async () => {
  const organizationId = '00000000-0000-4000-8000-000000000001';
  let stored = { id: organizationId, ...validSettings, website: null, company_size: null };
  const supabase = {
    from(table) {
      assert.equal(table, 'organizations');
      return {
        select(columns) {
          assert.equal(columns, 'id,name,website,industry,company_size,default_currency,timezone,locale');
          return { eq(column, value) { assert.equal(column, 'id'); assert.equal(value, organizationId); return { single: async () => ({ data: { ...stored }, error: null }) }; } };
        },
      };
    },
    async rpc(name, args) {
      assert.equal(name, 'update_organization_settings');
      assert.equal(args.org_id, organizationId);
      stored = {
        ...stored,
        name: args.organization_name,
        website: args.organization_website || null,
        industry: args.organization_industry || null,
        company_size: args.organization_company_size || null,
        default_currency: args.organization_currency,
        timezone: args.organization_timezone,
        locale: args.organization_locale,
      };
      return { data: { ...stored }, error: null };
    },
  };

  const initiallyLoaded = await getOrganizationSettings(supabase, organizationId);
  assert.equal(initiallyLoaded.website, null);
  assert.equal(initiallyLoaded.company_size, null);

  const payload = organizationSettingsSchema.parse({ ...validSettings, website: '', company_size: '' });
  const saved = await saveOrganizationSettings(supabase, organizationId, payload);
  assert.equal(saved.website, null);
  assert.equal(saved.company_size, null);
  const refreshed = await getOrganizationSettings(supabase, organizationId);
  assert.equal(refreshed.website, null);
  assert.equal(refreshed.company_size, null);
  assert.equal(refreshed.name, validSettings.name);
});

test('non-owner and non-admin organization updates are rejected by the role guard', () => {
  let statusCode;
  let responseBody;
  let nextCalled = false;
  const response = {
    status(code) { statusCode = code; return this; },
    json(body) { responseBody = body; return this; },
  };
  requireOrgRole('owner', 'admin')({ organization: { id: 'member-org', role: 'member' } }, response, () => { nextCalled = true; });
  assert.equal(statusCode, 403);
  assert.equal(responseBody.code, 'FORBIDDEN');
  assert.equal(nextCalled, false);
});
