import { Router, raw } from 'express';
import crypto from 'node:crypto';
import { z } from 'zod';
import { requireAuth, requireOrganization, requireOrgRole } from '../middleware/auth.js';
import { buildInvoicePdf, buildReportPdf } from '../services/invoicePdf.js';
import { emailProviderConfigured, sendEmail } from '../services/emailService.js';
import { getOrganizationSettings, organizationSettingsSchema, saveOrganizationSettings } from '../services/organizationSettings.js';
import teamRouter from './team.js';

const router = Router();
const wrap = (handler) => (req, res, next) => Promise.resolve(handler(req, res)).catch(next);
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
const customerSchema = z.object({ name: z.string().trim().min(1).max(160), email: z.string().email().max(254).optional().or(z.literal('')), phone: z.string().max(40).optional(), company_name: z.string().max(160).optional(), status: z.enum(['lead', 'active', 'inactive']).default('lead') }).strict();
const dealSchema = z.object({ customer_id: z.string().uuid(), title: z.string().trim().min(1).max(180), description: z.string().max(5000).nullable().optional(), value: z.string().regex(/^(0|[1-9]\d{0,11})(\.\d{1,2})?$/), currency: z.string().regex(/^[A-Z]{3}$/), stage: z.enum(['lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost']), expected_close_date: z.string().date().nullable().optional(), assigned_to: z.string().uuid().nullable().optional() }).strict();
const projectSchema = z.object({ name: z.string().trim().min(1).max(160), description: z.string().max(10000).optional(), customer_id: z.string().uuid().nullable().optional(), status: z.enum(['planned', 'active', 'on_hold', 'completed', 'cancelled']).default('active'), priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'), start_date: z.string().date().nullable().optional(), due_date: z.string().date().nullable().optional(), budget: z.number().nonnegative().nullable().optional(), currency: z.string().regex(/^[A-Z]{3}$/).default('USD') }).strict();
const taskSchema = z.object({ project_id: z.string().uuid().nullable().optional(), title: z.string().trim().min(1).max(200), description: z.string().max(10000).optional(), status: z.enum(['todo', 'in_progress', 'blocked', 'completed']).default('todo'), priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'), assigned_to: z.string().uuid().nullable().optional(), start_date: z.string().date().nullable().optional(), due_date: z.string().date().nullable().optional() }).strict();
const blogPostSchema = z.object({ title: z.string().trim().min(1).max(180), category_id: z.string().uuid().nullable().optional(), excerpt: z.string().max(500).default(''), body: z.string().max(100000), status: z.enum(['draft','published','archived']).default('draft') }).strict();
const moneyText = z.string().regex(/^(0|[1-9]\d{0,11})(\.\d{1,2})?$/);
const productSchema = z.object({ name: z.string().trim().min(1).max(180), description: z.string().max(1000).optional(), sku: z.string().trim().max(80).nullable().optional(), unit_price: moneyText, currency: z.string().regex(/^[A-Z]{3}$/) }).strict();
const invoiceItemSchema = z.union([
  z.object({ product_id: z.string().uuid(), description: z.string().max(500).optional(), quantity: z.string().regex(/^(0|[1-9]\d{0,8})(\.\d{1,3})?$/), unit_price: moneyText.optional() }).strict(),
  z.object({ description: z.string().trim().min(1).max(500), quantity: z.string().regex(/^(0|[1-9]\d{0,8})(\.\d{1,3})?$/), unit_price: moneyText }).strict(),
]);
const discountAmountText = z.preprocess((value) => value === '' || value === null ? '0' : value, moneyText.default('0'));
export const invoiceSchema = z.object({ customer_id: z.string().uuid(), currency: z.string().regex(/^[A-Z]{3}$/), issue_date: z.string().date(), due_date: z.string().date(), items: z.array(invoiceItemSchema).min(1).max(100), discount_amount: discountAmountText, tax_amount: moneyText.default('0'), notes: z.string().max(2000).nullable().optional(), terms: z.string().max(2000).nullable().optional() }).strict();
const paymentSchema = z.object({ amount: moneyText, currency: z.string().regex(/^[A-Z]{3}$/), method: z.enum(['cash', 'bank_transfer', 'check', 'other']), reference: z.string().max(120).nullable().optional(), payment_date: z.string().date().optional() }).strict();
const profileSchema = z.object({ full_name: z.string().trim().min(1).max(120), phone: z.string().max(40).nullable(), timezone: z.string().min(1).max(80), locale: z.string().min(2).max(10) }).strict();
const analyticsRangeSchema = z.object({ from: z.string().date(), to: z.string().date() }).strict();
const uploadedFileName = z.string().trim().min(1).max(255);

router.get('/auth/session', requireAuth, (req, res) => res.json({ success: true, data: { id: req.user.id, email: req.user.email } }));
router.get('/profile', requireAuth, wrap(async (req, res) => {
  const { data, error } = await req.supabase.from('profiles').select('id,full_name,email,avatar_url,phone,timezone,locale,created_at,updated_at').eq('id', req.user.id).single();
  if (error) throw error;
  res.json({ success: true, data });
}));
router.patch('/profile', requireAuth, wrap(async (req, res) => {
  const input = profileSchema.parse(req.body);
  const { data, error } = await req.supabase.from('profiles').update({ ...input, updated_at: new Date().toISOString() }).eq('id', req.user.id).select('id,full_name,email,avatar_url,phone,timezone,locale,updated_at').single();
  if (error) throw error;
  res.json({ success: true, data });
}));
router.get('/organizations', requireAuth, wrap(async (req, res) => {
  const { data, error } = await req.supabase.from('organization_memberships').select('role,status,organizations(id,name,slug,default_currency,timezone)').eq('user_id', req.user.id).eq('status', 'active');
  if (error) throw error;
  res.json({ success: true, data: (data || []).map((m) => ({ ...m.organizations, role: m.role })) });
}));
router.get('/organization/settings', requireAuth, requireOrganization, wrap(async (req, res) => {
  const data = await getOrganizationSettings(req.supabase, req.organization.id);
  res.json({ success: true, data });
}));
router.patch('/organization/settings', requireAuth, requireOrganization, requireOrgRole('owner','admin'), wrap(async (req, res) => {
  const input = organizationSettingsSchema.parse(req.body);
  const data = await saveOrganizationSettings(req.supabase, req.organization.id, input);
  res.json({ success: true, data });
}));
router.post('/organizations', requireAuth, wrap(async (req, res) => {
  const body = z.object({ name: z.string().trim().min(2).max(120), default_currency: z.enum(['USD', 'CAD', 'GBP', 'EUR']).default('USD'), timezone: z.string().min(1).max(80).default('UTC') }).strict().parse(req.body);
  const baseSlug = body.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'workspace';
  const slug = `${baseSlug}-${crypto.randomUUID().slice(0, 8)}`;
  const { data, error } = await req.supabase.rpc('create_organization', { organization_name: body.name, organization_slug: slug, organization_currency: body.default_currency, organization_timezone: body.timezone });
  if (error) throw error;
  res.status(201).json({ success: true, data });
}));
router.post('/invitations/accept', requireAuth, wrap(async (req, res) => {
  const input = z.object({ organization_id: z.string().uuid(), token: z.string().regex(/^[0-9a-f]{64}$/) }).strict().parse(req.body);
  const tokenHash = crypto.createHash('sha256').update(input.token).digest('hex');
  const { data, error } = await req.supabase.rpc('accept_org_invitation', { org_id: input.organization_id, token_hash: tokenHash });
  if (error) throw error;
  res.json({ success: true, data: Array.isArray(data) ? data[0] : data, message: 'Workspace invitation accepted.' });
}));

router.use(requireAuth, requireOrganization);
router.use('/organizations/:organizationId', teamRouter);

router.get('/customers', wrap(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1), limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  let query = req.supabase.from('customers').select('id,name,email,phone,company_name,status,created_at', { count: 'exact' }).eq('organization_id', req.organization.id).order('created_at', { ascending: false }).range((page - 1) * limit, page * limit - 1);
  if (req.query.search) query = query.ilike('name', `%${String(req.query.search).slice(0, 100)}%`);
  if (['lead', 'active', 'inactive'].includes(req.query.status)) query = query.eq('status', req.query.status);
  const { data, error, count } = await query;
  if (error) throw error;
  res.json({ success: true, data: { items: data, page, limit, total: count } });
}));
router.post('/customers', wrap(async (req, res) => {
  const input = customerSchema.parse(req.body);
  const { data, error } = await req.supabase.from('customers').insert({ ...input, organization_id: req.organization.id }).select().single();
  if (error) throw error;
  res.status(201).json({ success: true, data, message: 'Customer created.' });
}));
router.patch('/customers/:id', wrap(async (req, res) => {
  const input = customerSchema.partial().parse(req.body);
  const { data, error } = await req.supabase.from('customers').update(input).eq('id', req.params.id).eq('organization_id', req.organization.id).select().maybeSingle();
  if (error) throw error;
  if (!data) return res.status(404).json({ success: false, code: 'NOT_FOUND', message: 'Customer not found.' });
  res.json({ success: true, data });
}));
router.delete('/customers/:id', wrap(async (req, res) => {
  const { data, error } = await req.supabase.from('customers').delete().eq('id', req.params.id).eq('organization_id', req.organization.id).select('id').maybeSingle();
  if (error) throw error;
  if (!data) return res.status(404).json({ success: false, code: 'NOT_FOUND', message: 'Customer not found.' });
  res.json({ success: true, data: { id: data.id } });
}));

router.get('/products', wrap(async (req, res) => {
  let query = req.supabase.from('products').select('id,name,description,sku,unit_price,currency,active,created_at,updated_at').eq('organization_id', req.organization.id).order('name', { ascending: true }).limit(500);
  if (req.query.search) query = query.ilike('name', `%${String(req.query.search).slice(0, 80)}%`);
  if (req.query.include_inactive !== 'true') query = query.eq('active', true);
  const { data, error } = await query;
  if (error) throw error;
  res.json({ success: true, data: data || [] });
}));
router.post('/products', requireOrgRole('owner', 'admin', 'manager'), wrap(async (req, res) => {
  const input = productSchema.parse(req.body);
  const { data, error } = await req.supabase.from('products').insert({ ...input, description: input.description || '', organization_id: req.organization.id, sku: input.sku || null }).select('id,name,description,sku,unit_price,currency,active,created_at,updated_at').single();
  if (error) throw error;
  res.status(201).json({ success: true, data });
}));
router.patch('/products/:id', requireOrgRole('owner', 'admin', 'manager'), wrap(async (req, res) => {
  const input = productSchema.partial().parse(req.body);
  if (!Object.keys(input).length) return res.status(400).json({ success: false, code: 'EMPTY_UPDATE', message: 'Provide at least one product field to update.' });
  const { data, error } = await req.supabase.from('products').update({ ...input, ...(input.sku !== undefined ? { sku: input.sku || null } : {}), updated_at: new Date().toISOString() }).eq('id', req.params.id).eq('organization_id', req.organization.id).eq('active', true).select('id,name,description,sku,unit_price,currency,active,created_at,updated_at').maybeSingle();
  if (error) throw error;
  if (!data) return res.status(404).json({ success: false, code: 'NOT_FOUND', message: 'Active product not found.' });
  res.json({ success: true, data });
}));
router.delete('/products/:id', requireOrgRole('owner', 'admin', 'manager'), wrap(async (req, res) => {
  const { data, error } = await req.supabase.from('products').update({ active: false, updated_at: new Date().toISOString() }).eq('id', req.params.id).eq('organization_id', req.organization.id).eq('active', true).select('id').maybeSingle();
  if (error) throw error;
  if (!data) return res.status(404).json({ success: false, code: 'NOT_FOUND', message: 'Active product not found.' });
  res.json({ success: true, data: { id: data.id, active: false }, message: 'Product archived.' });
}));

router.get('/deals', wrap(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1), limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  let query = req.supabase.from('deals').select('id,customer_id,title,description,value,currency,stage,expected_close_date,assigned_to,created_at,updated_at', { count: 'exact' }).eq('organization_id', req.organization.id).order('updated_at', { ascending: false }).range((page - 1) * limit, page * limit - 1);
  if (['lead','qualified','proposal','negotiation','won','lost'].includes(req.query.stage)) query = query.eq('stage', req.query.stage);
  if (req.query.search) query = query.ilike('title', `%${String(req.query.search).slice(0, 100)}%`);
  const { data, error, count } = await query;
  if (error) throw error;
  const customerIds = [...new Set((data || []).map((deal) => deal.customer_id))];
  const { data: customerRows, error: customerError } = customerIds.length ? await req.supabase.from('customers').select('id,name,company_name').in('id', customerIds).eq('organization_id', req.organization.id) : { data: [], error: null };
  if (customerError) throw customerError;
  const customersById = new Map((customerRows || []).map((customer) => [customer.id, customer]));
  res.json({ success: true, data: { items: (data || []).map((deal) => ({ ...deal, customer: customersById.get(deal.customer_id) || null })), page, limit, total: count || 0 } });
}));
router.post('/deals', requireOrgRole('owner', 'admin', 'manager'), wrap(async (req, res) => {
  const input = dealSchema.parse(req.body);
  const { data, error } = await req.supabase.from('deals').insert({ ...input, organization_id: req.organization.id }).select().single();
  if (error) throw error;
  res.status(201).json({ success: true, data });
}));
router.patch('/deals/:id', requireOrgRole('owner', 'admin', 'manager'), wrap(async (req, res) => {
  const input = dealSchema.partial().parse(req.body);
  const { data, error } = await req.supabase.from('deals').update(input).eq('id', req.params.id).eq('organization_id', req.organization.id).select().maybeSingle();
  if (error) throw error;
  if (!data) return res.status(404).json({ success: false, code: 'NOT_FOUND', message: 'Deal not found.' });
  res.json({ success: true, data });
}));
router.delete('/deals/:id', requireOrgRole('owner', 'admin', 'manager'), wrap(async (req, res) => {
  const { data, error } = await req.supabase.from('deals').delete().eq('id', req.params.id).eq('organization_id', req.organization.id).select('id').maybeSingle();
  if (error) throw error;
  if (!data) return res.status(404).json({ success: false, code: 'NOT_FOUND', message: 'Deal not found.' });
  res.json({ success: true, data: { id: data.id } });
}));

router.get('/projects', wrap(async (req, res) => {
  const { data, error } = await req.supabase.from('projects').select('id,name,description,status,priority,start_date,due_date,budget,currency,customer_id,created_at').eq('organization_id', req.organization.id).order('created_at', { ascending: false }).limit(100);
  if (error) throw error;
  res.json({ success: true, data: data || [] });
}));
router.post('/projects', requireOrgRole('owner', 'admin', 'manager'), wrap(async (req, res) => {
  const input = projectSchema.parse(req.body);
  const { data, error } = await req.supabase.from('projects').insert({ ...input, organization_id: req.organization.id, created_by: req.user.id }).select().single();
  if (error) throw error;
  res.status(201).json({ success: true, data });
}));
router.patch('/projects/:id', requireOrgRole('owner', 'admin', 'manager'), wrap(async (req, res) => {
  const input = projectSchema.partial().parse(req.body);
  const { data, error } = await req.supabase.from('projects').update(input).eq('id', req.params.id).eq('organization_id', req.organization.id).select().maybeSingle();
  if (error) throw error;
  if (!data) return res.status(404).json({ success: false, code: 'NOT_FOUND', message: 'Project not found.' });
  res.json({ success: true, data });
}));
router.get('/projects/:id/members', wrap(async (req, res) => {
  const { data, error } = await req.supabase.from('project_members').select('user_id,role').eq('project_id', req.params.id).eq('organization_id', req.organization.id);
  if (error) throw error;
  res.json({ success: true, data: data || [] });
}));
router.put('/projects/:id/members/:userId', requireOrgRole('owner', 'admin', 'manager'), wrap(async (req, res) => {
  const input = z.object({ role: z.enum(['member', 'lead']).default('member') }).strict().parse(req.body);
  const { data, error } = await req.supabase.from('project_members').upsert({ project_id: req.params.id, organization_id: req.organization.id, user_id: req.params.userId, role: input.role }, { onConflict: 'project_id,user_id' }).select('project_id,organization_id,user_id,role').single();
  if (error) throw error;
  res.status(200).json({ success: true, data });
}));
router.delete('/projects/:id/members/:userId', requireOrgRole('owner', 'admin', 'manager'), wrap(async (req, res) => {
  const { data, error } = await req.supabase.from('project_members').delete().eq('project_id', req.params.id).eq('organization_id', req.organization.id).eq('user_id', req.params.userId).select('user_id').maybeSingle();
  if (error) throw error;
  if (!data) return res.status(404).json({ success: false, code: 'NOT_FOUND', message: 'Project member not found.' });
  res.json({ success: true, data });
}));
router.get('/projects/:id/comments', wrap(async (req, res) => {
  const { data, error } = await req.supabase.from('project_comments').select('id,project_id,body,created_at,author_id').eq('project_id', req.params.id).eq('organization_id', req.organization.id).order('created_at', { ascending: true }).limit(200);
  if (error) throw error;
  res.json({ success: true, data: data || [] });
}));
router.post('/projects/:id/comments', wrap(async (req, res) => {
  const input = z.object({ body: z.string().trim().min(1).max(5000) }).strict().parse(req.body);
  const { data, error } = await req.supabase.from('project_comments').insert({ project_id: req.params.id, organization_id: req.organization.id, author_id: req.user.id, body: input.body }).select('id,project_id,body,created_at,author_id').single();
  if (error) throw error;
  res.status(201).json({ success: true, data });
}));

router.get('/tasks', wrap(async (req, res) => {
  let query = req.supabase.from('tasks').select('id,project_id,title,description,status,priority,assigned_to,start_date,due_date,completed_at,created_at').eq('organization_id', req.organization.id).order('due_date', { ascending: true }).limit(100);
  if (req.query.status && ['todo', 'in_progress', 'blocked', 'completed'].includes(req.query.status)) query = query.eq('status', req.query.status);
  const { data, error } = await query;
  if (error) throw error;
  res.json({ success: true, data: data || [] });
}));
router.post('/tasks', requireOrgRole('owner', 'admin', 'manager'), wrap(async (req, res) => {
  const input = taskSchema.parse(req.body);
  const { data, error } = await req.supabase.from('tasks').insert({ ...input, organization_id: req.organization.id, completed_at: input.status === 'completed' ? new Date().toISOString() : null }).select().single();
  if (error) throw error;
  res.status(201).json({ success: true, data });
}));
router.patch('/tasks/:id', wrap(async (req, res) => {
  const input = taskSchema.partial().parse(req.body);
  const { data, error } = await req.supabase.rpc('update_task', { org_id: req.organization.id, target_task: req.params.id, task_values: input });
  if (error) throw error;
  res.json({ success: true, data: Array.isArray(data) ? data[0] : data });
}));

router.get('/notifications', wrap(async (req, res) => {
  let query = req.supabase.from('notifications').select('id,title,message,type,is_read,action_url,created_at', { count: 'exact' }).eq('organization_id', req.organization.id).eq('user_id', req.user.id).order('created_at', { ascending: false }).limit(30);
  if (req.query.unread === 'true') query = query.eq('is_read', false);
  const [{ data, error, count }, { count: unreadCount, error: unreadError }] = await Promise.all([query, req.supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('organization_id', req.organization.id).eq('user_id', req.user.id).eq('is_read', false)]);
  if (error) throw error; if (unreadError) throw unreadError;
  res.json({ success: true, data: { items: data || [], total: count || 0, unreadCount: unreadCount || 0 } });
}));
router.get('/activity', requireOrgRole('owner','admin'), wrap(async (req, res) => {
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
  const { data, error } = await req.supabase.from('audit_logs').select('id,user_id,action,entity_type,entity_id,metadata,created_at').eq('organization_id', req.organization.id).order('created_at', { ascending: false }).limit(limit);
  if (error) throw error;
  const userIds = [...new Set((data || []).map((row) => row.user_id).filter(Boolean))];
  const { data: profiles, error: profileError } = userIds.length ? await req.supabase.from('profiles').select('id,full_name,email').in('id', userIds) : { data: [], error: null };
  if (profileError) throw profileError;
  const byId = new Map((profiles || []).map((profile) => [profile.id, profile]));
  res.json({ success: true, data: (data || []).map((row) => ({ ...row, actor: byId.get(row.user_id) || null })) });
}));
router.patch('/notifications/read-all', wrap(async (req, res) => {
  const { error } = await req.supabase.from('notifications').update({ is_read: true }).eq('organization_id', req.organization.id).eq('user_id', req.user.id).eq('is_read', false);
  if (error) throw error;
  res.json({ success: true, data: { updated: true } });
}));
router.patch('/notifications/:id/read', wrap(async (req, res) => {
  const { data, error } = await req.supabase.from('notifications').update({ is_read: true }).eq('id', req.params.id).eq('organization_id', req.organization.id).eq('user_id', req.user.id).select('id,is_read').maybeSingle();
  if (error) throw error;
  if (!data) return res.status(404).json({ success: false, code: 'NOT_FOUND', message: 'Notification not found.' });
  res.json({ success: true, data });
}));

router.get('/files', wrap(async (req, res) => {
  const { data, error } = await req.supabase.from('stored_files').select('id,original_name,content_type,size_bytes,created_at').eq('organization_id', req.organization.id).order('created_at', { ascending: false }).limit(100);
  if (error) throw error;
  res.json({ success: true, data: data || [] });
}));
router.post('/files', requireOrgRole('owner','admin','manager'), raw({ type: '*/*', limit: '10mb' }), wrap(async (req, res) => {
  if (!Buffer.isBuffer(req.body) || req.body.length < 1) return res.status(400).json({ success: false, code: 'VALIDATION_ERROR', message: 'Choose a non-empty file.' });
  const contentType = z.enum(['application/pdf','image/jpeg','image/png','image/webp','text/plain','text/csv']).parse(req.headers['content-type']);
  let name;
  try { name = uploadedFileName.parse(decodeURIComponent(String(req.headers['x-file-name'] || ''))); }
  catch { return res.status(400).json({ success: false, code: 'VALIDATION_ERROR', message: 'The filename is invalid.' }); }
  const cleanName = [...name].map((character) => { const code = character.charCodeAt(0); return character === '/' || character === '\\' || code < 32 || code === 127 ? '_' : character; }).join('');
  const fileId = crypto.randomUUID();
  const storagePath = `${req.organization.id}/${fileId}/${cleanName}`;
  const { error: storageError } = await req.supabase.storage.from('berry-private').upload(storagePath, req.body, { contentType, upsert: false });
  if (storageError) throw storageError;
  const { data, error } = await req.supabase.from('stored_files').insert({ id: fileId, organization_id: req.organization.id, storage_path: storagePath, original_name: cleanName, content_type: contentType, size_bytes: req.body.length, uploaded_by: req.user.id }).select('id,original_name,content_type,size_bytes,created_at').single();
  if (error) { await req.supabase.storage.from('berry-private').remove([storagePath]); throw error; }
  res.status(201).json({ success: true, data });
}));
router.get('/files/:id/download', wrap(async (req, res) => {
  const { data: file, error } = await req.supabase.from('stored_files').select('storage_path').eq('id', req.params.id).eq('organization_id', req.organization.id).single();
  if (error) throw error;
  const { data, error: urlError } = await req.supabase.storage.from('berry-private').createSignedUrl(file.storage_path, 60);
  if (urlError) throw urlError;
  res.json({ success: true, data: { url: data.signedUrl, expiresIn: 60 } });
}));
router.delete('/files/:id', requireOrgRole('owner','admin','manager'), wrap(async (req, res) => {
  const { data: file, error } = await req.supabase.from('stored_files').select('id,storage_path').eq('id', req.params.id).eq('organization_id', req.organization.id).single();
  if (error) throw error;
  const { error: storageError } = await req.supabase.storage.from('berry-private').remove([file.storage_path]);
  if (storageError) throw storageError;
  const { error: deleteError } = await req.supabase.from('stored_files').delete().eq('id', file.id).eq('organization_id', req.organization.id);
  if (deleteError) throw deleteError;
  res.json({ success: true, data: { id: file.id } });
}));
router.get('/exports/:resource.csv', wrap(async (req, res) => {
  const exports = {
    customers: ['customers','id,name,email,phone,company_name,status,country,created_at'],
    deals: ['deals','id,customer_id,title,value,currency,stage,expected_close_date,created_at'],
    invoices: ['invoices','invoice_number,currency,issue_date,due_date,subtotal,discount_amount,tax_amount,total_amount,amount_paid,balance_due,status'],
    projects: ['projects','id,name,status,priority,start_date,due_date,budget,currency,created_at'],
    tasks: ['tasks','id,project_id,title,status,priority,assigned_to,start_date,due_date,completed_at'],
  };
  const [table, columns] = exports[req.params.resource] || [];
  if (!table) return res.status(404).json({ success: false, code: 'NOT_FOUND', message: 'This export type is not available.' });
  const rows = [];
  for (let offset = 0; offset <= 5000; offset += 1000) {
    const { data, error } = await req.supabase.from(table).select(columns).eq('organization_id', req.organization.id).order('id', { ascending: true }).range(offset, offset + 999);
    if (error) throw error;
    rows.push(...(data || []));
    if ((data || []).length < 1000) break;
  }
  if (rows.length > 5000) return res.status(413).json({ success: false, code: 'EXPORT_TOO_LARGE', message: 'This export is limited to 5,000 visible rows. Filter the data and retry.' });
  const headers = columns.split(',');
  const csvCell = (value) => { let text = value == null ? '' : String(value); if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`; return `"${text.replace(/"/g,'""')}"`; };
  const csv = [headers.map(csvCell).join(','), ...rows.map((row) => headers.map((field) => csvCell(row[field])).join(','))].join('\r\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="berry-${req.params.resource}.csv"`);
  res.setHeader('Cache-Control', 'private, no-store');
  res.send(`\uFEFF${csv}`);
}));
router.get('/reports/:resource.pdf', wrap(async (req, res) => {
  const reports = {
    customers: { table: 'customers', columns: [{ key: 'name', label: 'Name' }, { key: 'email', label: 'Email' }, { key: 'company_name', label: 'Company' }, { key: 'status', label: 'Status' }, { key: 'created_at', label: 'Created' }] },
    deals: { table: 'deals', columns: [{ key: 'title', label: 'Deal' }, { key: 'value', label: 'Value' }, { key: 'currency', label: 'Currency' }, { key: 'stage', label: 'Stage' }, { key: 'expected_close_date', label: 'Expected close' }] },
    projects: { table: 'projects', columns: [{ key: 'name', label: 'Project' }, { key: 'status', label: 'Status' }, { key: 'priority', label: 'Priority' }, { key: 'start_date', label: 'Start' }, { key: 'due_date', label: 'Due' }, { key: 'budget', label: 'Budget' }, { key: 'currency', label: 'Currency' }] },
    tasks: { table: 'tasks', columns: [{ key: 'title', label: 'Task' }, { key: 'status', label: 'Status' }, { key: 'priority', label: 'Priority' }, { key: 'assigned_to', label: 'Assignee' }, { key: 'due_date', label: 'Due' }] },
    invoices: { table: 'invoices', columns: [{ key: 'invoice_number', label: 'Invoice' }, { key: 'issue_date', label: 'Issued' }, { key: 'due_date', label: 'Due' }, { key: 'total_amount', label: 'Total' }, { key: 'amount_paid', label: 'Paid' }, { key: 'balance_due', label: 'Balance' }, { key: 'status', label: 'Status' }] },
  };
  const report = reports[req.params.resource];
  if (!report) return res.status(404).json({ success: false, code: 'NOT_FOUND', message: 'This report type is not available.' });
  const fields = report.columns.map(({ key }) => key).join(',');
  const { data, error } = await req.supabase.from(report.table).select(fields).eq('organization_id', req.organization.id).order('id', { ascending: true }).limit(5000);
  if (error) throw error;
  const { data: organization, error: organizationError } = await req.supabase.from('organizations').select('name').eq('id', req.organization.id).single();
  if (organizationError) throw organizationError;
  const pdf = await buildReportPdf({ title: `${req.params.resource[0].toUpperCase()}${req.params.resource.slice(1)} report`, organizationName: organization.name, columns: report.columns, rows: data || [] });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="berry-${req.params.resource}-report.pdf"`);
  res.setHeader('Cache-Control', 'private, no-store');
  res.send(pdf);
}));

router.get('/blog/categories', wrap(async (req, res) => {
  const { data, error } = await req.supabase.from('blog_categories').select('id,name').eq('organization_id', req.organization.id).order('name');
  if (error) throw error;
  res.json({ success: true, data: data || [] });
}));
router.post('/blog/categories', requireOrgRole('owner','admin','manager'), wrap(async (req, res) => {
  const input = z.object({ name: z.string().trim().min(1).max(80) }).strict().parse(req.body);
  const { data, error } = await req.supabase.from('blog_categories').insert({ ...input, organization_id: req.organization.id }).select('id,name').single();
  if (error) throw error;
  res.status(201).json({ success: true, data });
}));
router.get('/blog', wrap(async (req, res) => {
  let query = req.supabase.from('blog_posts').select('id,category_id,title,slug,excerpt,body,status,published_at,created_at,updated_at', { count: 'exact' }).eq('organization_id', req.organization.id).order('updated_at', { ascending: false }).limit(100);
  if (['draft','published','archived'].includes(req.query.status)) query = query.eq('status', req.query.status);
  if (req.query.search) query = query.ilike('title', `%${String(req.query.search).slice(0,100)}%`);
  const { data, error, count } = await query;
  if (error) throw error;
  res.json({ success: true, data: { items: data || [], total: count || 0 } });
}));
router.post('/blog', requireOrgRole('owner','admin','manager'), wrap(async (req, res) => {
  const input = blogPostSchema.parse(req.body);
  const slugBase = input.title.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,120) || 'post';
  const { data, error } = await req.supabase.from('blog_posts').insert({ ...input, slug: `${slugBase}-${crypto.randomUUID().slice(0,8)}`, organization_id: req.organization.id, created_by: req.user.id, published_at: input.status === 'published' ? new Date().toISOString() : null }).select().single();
  if (error) throw error;
  res.status(201).json({ success: true, data });
}));
router.patch('/blog/:id', requireOrgRole('owner','admin','manager'), wrap(async (req, res) => {
  const input = blogPostSchema.partial().parse(req.body);
  const values = { ...input, updated_at: new Date().toISOString() };
  if (input.status === 'published') values.published_at = new Date().toISOString();
  const { data, error } = await req.supabase.from('blog_posts').update(values).eq('id', req.params.id).eq('organization_id', req.organization.id).select().maybeSingle();
  if (error) throw error;
  if (!data) return res.status(404).json({ success: false, code: 'NOT_FOUND', message: 'Post not found.' });
  res.json({ success: true, data });
}));
router.delete('/blog/:id', requireOrgRole('owner','admin','manager'), wrap(async (req, res) => {
  const { data, error } = await req.supabase.from('blog_posts').delete().eq('id', req.params.id).eq('organization_id', req.organization.id).select('id').maybeSingle();
  if (error) throw error;
  if (!data) return res.status(404).json({ success: false, code: 'NOT_FOUND', message: 'Post not found.' });
  res.json({ success: true, data: { id: data.id } });
}));

router.get('/invoices', wrap(async (req, res) => {
  let query = req.supabase.from('invoices').select('id,invoice_number,currency,issue_date,due_date,total_amount,amount_paid,balance_due,status,customers(name)', { count: 'exact' }).eq('organization_id', req.organization.id).order('created_at', { ascending: false }).limit(100);
  if (['draft', 'issued', 'partial', 'paid', 'overdue', 'cancelled'].includes(req.query.status)) query = query.eq('status', req.query.status);
  if (req.query.search) query = query.ilike('invoice_number', `%${String(req.query.search).slice(0, 80)}%`);
  const { data, error } = await query;
  if (error) throw error;
  res.json({ success: true, data: data || [] });
}));
router.post('/invoices', requireOrgRole('owner', 'admin', 'manager'), wrap(async (req, res) => {
  const input = invoiceSchema.parse(req.body);
  const { data, error } = await req.supabase.rpc('create_invoice_draft', { org_id: req.organization.id, customer_id: input.customer_id, invoice_currency: input.currency, invoice_issue_date: input.issue_date, invoice_due_date: input.due_date, line_items: input.items, discount: input.discount_amount, tax: input.tax_amount, invoice_notes: input.notes ?? null, invoice_terms: input.terms ?? null });
  if (error) throw error;
  res.status(201).json({ success: true, data: Array.isArray(data) ? data[0] : data });
}));
router.get('/invoices/:id', wrap(async (req, res) => {
  const invoiceQuery = await req.supabase.from('invoices').select('*,customers(name,email,company_name,address,country)').eq('id', req.params.id).eq('organization_id', req.organization.id).maybeSingle();
  if (invoiceQuery.error) throw invoiceQuery.error;
  if (!invoiceQuery.data) return res.status(404).json({ success: false, code: 'NOT_FOUND', message: 'Invoice not found.' });
  const [items, payments] = await Promise.all([
    req.supabase.from('invoice_items').select('id,product_id,description,quantity,unit_price,line_total').eq('invoice_id', req.params.id).eq('organization_id', req.organization.id),
    req.supabase.from('invoice_payments').select('id,amount,currency,payment_method,payment_reference,payment_date,status,created_at').eq('invoice_id', req.params.id).eq('organization_id', req.organization.id).order('payment_date', { ascending: false }),
  ]);
  if (items.error) throw items.error;
  if (payments.error) throw payments.error;
  res.json({ success: true, data: { ...invoiceQuery.data, items: items.data || [], payments: payments.data || [] } });
}));
router.patch('/invoices/:id', requireOrgRole('owner', 'admin', 'manager'), wrap(async (req, res) => {
  const input = invoiceSchema.parse(req.body);
  const { data, error } = await req.supabase.rpc('update_invoice_draft', { org_id: req.organization.id, target_invoice: req.params.id, customer_id: input.customer_id, invoice_currency: input.currency, invoice_issue_date: input.issue_date, invoice_due_date: input.due_date, line_items: input.items, discount: input.discount_amount, tax: input.tax_amount, invoice_notes: input.notes ?? null, invoice_terms: input.terms ?? null });
  if (error) throw error;
  res.json({ success: true, data: Array.isArray(data) ? data[0] : data });
}));
router.post('/invoices/:id/issue', requireOrgRole('owner', 'admin', 'manager'), wrap(async (req, res) => {
  const { data, error } = await req.supabase.rpc('issue_invoice', { org_id: req.organization.id, target_invoice: req.params.id });
  if (error) throw error;
  res.json({ success: true, data: Array.isArray(data) ? data[0] : data, message: 'Invoice issued.' });
}));
router.post('/invoices/:id/send', requireOrgRole('owner','admin','manager'), wrap(async (req, res) => {
  if (!emailProviderConfigured()) return res.status(503).json({ success: false, code: 'EMAIL_NOT_CONFIGURED', message: 'Invoice email is disabled until an email provider is configured.' });
  const idempotencyKey = z.string().uuid().parse(req.headers['idempotency-key']);
  const { data: invoice, error } = await req.supabase.from('invoices').select('id,invoice_number,status,issued_snapshot,customers(email,name)').eq('id', req.params.id).eq('organization_id', req.organization.id).maybeSingle();
  if (error) throw error;
  if (!invoice) return res.status(404).json({ success: false, code: 'NOT_FOUND', message: 'Invoice not found.' });
  if (['draft','cancelled'].includes(invoice.status) || !invoice.issued_snapshot) return res.status(409).json({ success: false, code: 'INVALID_STATE', message: 'Only issued invoices can be emailed.' });
  if (!invoice.customers?.email) return res.status(400).json({ success: false, code: 'CUSTOMER_EMAIL_MISSING', message: 'Add an email address to this invoice customer before sending.' });
  const { data: organization, error: organizationError } = await req.supabase.from('organizations').select('name').eq('id', req.organization.id).single();
  if (organizationError) throw organizationError;
  const pdf = await buildInvoicePdf(invoice, organization.name);
  await sendEmail({ to: invoice.customers.email, subject: `Invoice ${invoice.invoice_number} from ${organization.name}`, text: `Hello ${invoice.customers.name}, please find invoice ${invoice.invoice_number} attached.`, html: `<p>Hello ${escapeHtml(invoice.customers.name)},</p><p>Please find invoice <strong>${escapeHtml(invoice.invoice_number)}</strong> from ${escapeHtml(organization.name)} attached.</p>`, idempotencyKey: `invoice/${invoice.id}/${idempotencyKey}`, attachments: [{ filename: `${invoice.invoice_number}.pdf`, content: pdf.toString('base64') }] });
  res.json({ success: true, data: { id: invoice.id, sent: true }, message: 'Invoice email sent.' });
}));
router.post('/invoices/:id/payments', requireOrgRole('owner', 'admin', 'manager'), wrap(async (req, res) => {
  const input = paymentSchema.parse(req.body);
  const idempotencyKey = z.string().uuid().parse(req.headers['idempotency-key']);
  const { data, error } = await req.supabase.rpc('record_invoice_payment', { org_id: req.organization.id, target_invoice: req.params.id, payment_amount: input.amount, payment_currency: input.currency, payment_idempotency_key: idempotencyKey, payment_method_value: input.method, payment_reference_value: input.reference ?? null, payment_date_value: input.payment_date });
  if (error) throw error;
  res.status(201).json({ success: true, data: Array.isArray(data) ? data[0] : data, message: 'Payment recorded.' });
}));
router.post('/invoices/:id/cancel', requireOrgRole('owner', 'admin', 'manager'), wrap(async (req, res) => {
  const { data, error } = await req.supabase.rpc('cancel_invoice', { org_id: req.organization.id, target_invoice: req.params.id });
  if (error) throw error;
  res.json({ success: true, data: Array.isArray(data) ? data[0] : data, message: 'Invoice cancelled.' });
}));
router.get('/invoices/:id/pdf', wrap(async (req, res) => {
  const { data, error } = await req.supabase.from('invoices').select('id,invoice_number,status,issued_snapshot').eq('id', req.params.id).eq('organization_id', req.organization.id).maybeSingle();
  if (error) throw error;
  if (!data) return res.status(404).json({ success: false, code: 'NOT_FOUND', message: 'Invoice not found.' });
  if (data.status === 'draft' || data.status === 'cancelled') return res.status(409).json({ success: false, code: 'INVALID_STATE', message: 'Only issued invoices can be downloaded.' });
  const { data: organization, error: organizationError } = await req.supabase.from('organizations').select('name').eq('id', req.organization.id).single();
  if (organizationError) throw organizationError;
  const pdf = await buildInvoicePdf(data, organization.name);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${data.invoice_number}.pdf"`);
  res.setHeader('Cache-Control', 'private, no-store');
  res.send(pdf);
}));
router.get('/dashboard', wrap(async (req, res) => {
  const { data, error } = await req.supabase.rpc('organization_metrics', { org_id: req.organization.id });
  if (error) throw error;
  const currencies = Object.keys(data?.currencies || {});
  const sameCurrency = currencies.length <= 1;
  const currency = currencies[0] || 'USD';
  const aggregate = sameCurrency ? data?.currencies?.[currency] || { invoiced: 0, outstanding: 0 } : null;
  res.json({ success: true, data: { customers: Number(data?.customers || 0), activeProjects: Number(data?.activeProjects || 0), openTasks: Number(data?.openTasks || 0), currency: sameCurrency ? currency : null, invoiced: aggregate?.invoiced ?? null, outstanding: aggregate?.outstanding ?? null, currencyMix: sameCurrency ? [] : currencies } });
}));

router.get('/analytics', wrap(async (req, res) => {
  const { from, to } = analyticsRangeSchema.parse({ from: req.query.from, to: req.query.to });
  const { data, error } = await req.supabase.rpc('analytics_summary', { org_id: req.organization.id, range_start: from, range_end: to });
  if (error) throw error;
  res.json({ success: true, data: data || {} });
}));

export default router;
