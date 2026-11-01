import { z } from 'zod';

const nullableText = (maxLength) => z.preprocess(
  (value) => typeof value === 'string' ? value.trim() : value,
  z.string().max(maxLength).nullable().transform((value) => value ?? ''),
);

const websiteValue = z.preprocess(
  (value) => typeof value === 'string' ? value.trim() : value,
  z.string().max(300).nullable().transform((value) => value ?? '').refine((value) => {
    if (!value) return true;
    try {
      const parsed = new URL(value);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  }, { message: 'Enter a valid website URL beginning with http:// or https://, or leave it blank.' }),
);

export const organizationSettingsSchema = z.object({
  name: z.string().trim().min(2).max(120),
  website: websiteValue,
  industry: nullableText(120),
  company_size: nullableText(40),
  default_currency: z.enum(['USD', 'CAD', 'GBP', 'EUR']),
  timezone: z.string().trim().min(1).max(80),
  locale: z.string().trim().min(2).max(10),
}).strict();

export async function getOrganizationSettings(supabase, organizationId) {
  const { data, error } = await supabase.from('organizations')
    .select('id,name,website,industry,company_size,default_currency,timezone,locale')
    .eq('id', organizationId)
    .single();
  if (error) throw error;
  return data;
}

export async function saveOrganizationSettings(supabase, organizationId, input) {
  const { data, error } = await supabase.rpc('update_organization_settings', {
    org_id: organizationId,
    organization_name: input.name,
    organization_website: input.website,
    organization_industry: input.industry,
    organization_company_size: input.company_size,
    organization_currency: input.default_currency,
    organization_timezone: input.timezone,
    organization_locale: input.locale,
  });
  if (error) throw error;
  return Array.isArray(data) ? data[0] : data;
}
