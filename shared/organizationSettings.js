const settingsFields = ['name', 'website', 'industry', 'company_size', 'default_currency', 'timezone', 'locale'];

export const emptyOrganizationSettings = {
  name: '',
  website: '',
  industry: '',
  company_size: '',
  default_currency: 'USD',
  timezone: 'UTC',
  locale: 'en',
};

export function normalizeOrganizationSettings(settings = {}) {
  return {
    name: settings.name ?? '',
    website: settings.website ?? '',
    industry: settings.industry ?? '',
    company_size: settings.company_size ?? '',
    default_currency: settings.default_currency ?? 'USD',
    timezone: settings.timezone ?? 'UTC',
    locale: settings.locale ?? 'en',
  };
}

export function buildOrganizationSettingsPayload(settings = {}) {
  const normalized = normalizeOrganizationSettings(settings);
  return Object.fromEntries(settingsFields.map((field) => [field, normalized[field]]));
}

export function validateOrganizationWebsite(value) {
  const website = String(value ?? '').trim();
  if (!website) return '';
  try {
    const parsed = new URL(website);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') return '';
  } catch {
    // URL parsing failure is shown as a field-level form error.
  }
  return 'Enter a valid website URL beginning with http:// or https://, or leave it blank.';
}
