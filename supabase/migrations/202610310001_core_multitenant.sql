create extension if not exists pgcrypto;

create type public.member_role as enum ('owner', 'admin', 'manager', 'member', 'viewer', 'client');
create type public.membership_status as enum ('active', 'invited', 'suspended');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '', email text not null default '', avatar_url text,
  phone text, timezone text not null default 'UTC', locale text not null default 'en',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create or replace function public.create_profile_for_auth_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''), coalesce(new.email, ''))
  on conflict (id) do update set email = excluded.email, updated_at = now();
  return new;
end;
$$;
create trigger auth_user_profile_created after insert on auth.users for each row execute function public.create_profile_for_auth_user();

create table public.organizations (
  id uuid primary key default gen_random_uuid(), name text not null check (length(trim(name)) between 2 and 120),
  slug text not null unique, logo_url text, website text, industry text, company_size text,
  default_currency text not null default 'USD' check (default_currency ~ '^[A-Z]{3}$'),
  timezone text not null default 'UTC', locale text not null default 'en',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.organization_memberships (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade, role public.member_role not null default 'member',
  status public.membership_status not null default 'active', joined_at timestamptz, created_at timestamptz not null default now(),
  unique (organization_id, user_id), unique (id, organization_id)
);
create index memberships_user_status_idx on public.organization_memberships(user_id, status);

create table public.organization_invitations (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
  email text not null, role public.member_role not null default 'member' check (role <> 'owner'),
  invitation_token_hash text not null unique, expires_at timestamptz not null, accepted_at timestamptz,
  revoked_at timestamptz, invited_by uuid references auth.users(id) on delete set null, created_at timestamptz not null default now(),
  unique (organization_id, email)
);

create table public.customers (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 160), email text, phone text, company_name text, website text,
  industry text, address jsonb not null default '{}'::jsonb, country text, source text,
  status text not null default 'lead' check (status in ('lead','active','inactive')),
  notes text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique (id, organization_id)
);
create index customers_org_created_idx on public.customers(organization_id, created_at desc);
create index customers_org_email_idx on public.customers(organization_id, email);

create table public.deals (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
  customer_id uuid not null, title text not null, description text, value numeric(14,2) not null default 0 check (value >= 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'), stage text not null default 'lead' check (stage in ('lead','qualified','proposal','negotiation','won','lost')), expected_close_date date,
  assigned_to uuid, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  foreign key (customer_id, organization_id) references public.customers(id, organization_id) on delete cascade,
  foreign key (organization_id, assigned_to) references public.organization_memberships(organization_id, user_id) on delete set null (assigned_to)
);
create index deals_org_stage_idx on public.deals(organization_id, stage, currency);

create table public.blog_categories (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 80), created_at timestamptz not null default now(),
  unique (id, organization_id), unique (organization_id, name)
);
create table public.blog_posts (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
  category_id uuid, title text not null check (length(trim(title)) between 1 and 180), slug text not null,
  excerpt text not null default '', body text not null default '', status text not null default 'draft' check (status in ('draft','published','archived')),
  created_by uuid references auth.users(id) on delete set null, published_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique (id, organization_id), unique (organization_id, slug),
  foreign key (category_id, organization_id) references public.blog_categories(id, organization_id) on delete set null (category_id)
);
create index blog_posts_org_status_date_idx on public.blog_posts(organization_id, status, updated_at desc);

create table public.invoices (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
  customer_id uuid not null, invoice_number text not null, currency text not null check (currency ~ '^[A-Z]{3}$'),
  issue_date date not null, due_date date not null, subtotal numeric(14,2) not null default 0 check (subtotal >= 0),
  discount_amount numeric(14,2) not null default 0 check (discount_amount >= 0), tax_amount numeric(14,2) not null default 0 check (tax_amount >= 0),
  total_amount numeric(14,2) not null default 0 check (total_amount >= 0), amount_paid numeric(14,2) not null default 0 check (amount_paid >= 0),
  balance_due numeric(14,2) generated always as (greatest(total_amount - amount_paid, 0)) stored,
  status text not null default 'draft' check (status in ('draft','issued','partial','paid','overdue','cancelled')),
  notes text, terms text, pdf_storage_path text, created_by uuid references auth.users(id) on delete set null,
  issued_snapshot jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (organization_id, invoice_number), unique (id, organization_id),
  foreign key (customer_id, organization_id) references public.customers(id, organization_id) on delete restrict,
  check (due_date >= issue_date), check (amount_paid <= total_amount)
);
create index invoices_org_due_idx on public.invoices(organization_id, due_date) where status in ('issued','partial','overdue');
create index invoices_org_issue_idx on public.invoices(organization_id, issue_date, currency);

create table public.invoice_items (
  id uuid primary key default gen_random_uuid(), invoice_id uuid not null, organization_id uuid not null,
  description text not null, quantity numeric(12,3) not null check (quantity > 0), unit_price numeric(14,2) not null check (unit_price >= 0),
  line_total numeric(14,2) generated always as (round(quantity * unit_price, 2)) stored,
  foreign key (invoice_id, organization_id) references public.invoices(id, organization_id) on delete cascade
);

create table public.invoice_payments (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null, invoice_id uuid not null,
  amount numeric(14,2) not null check (amount > 0), currency text not null check (currency ~ '^[A-Z]{3}$'),
  payment_method text, payment_reference text, idempotency_key uuid not null, payment_date date not null default current_date,
  status text not null default 'recorded' check (status in ('pending','recorded','failed','refunded')), created_at timestamptz not null default now(),
  foreign key (invoice_id, organization_id) references public.invoices(id, organization_id) on delete restrict,
  unique (organization_id, idempotency_key)
);
create index payments_org_date_idx on public.invoice_payments(organization_id, payment_date, currency);
create table public.invoice_sequences (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  invoice_year integer not null check (invoice_year between 2000 and 9999), last_number bigint not null check (last_number > 0),
  primary key (organization_id, invoice_year)
);

create table public.projects (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
  customer_id uuid, name text not null, description text, status text not null default 'active' check (status in ('planned','active','on_hold','completed','cancelled')),
  priority text not null default 'normal' check (priority in ('low','normal','high','urgent')), start_date date, due_date date,
  budget numeric(14,2) check (budget is null or budget >= 0), currency text not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  created_by uuid references auth.users(id) on delete set null, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique (id, organization_id),
  foreign key (customer_id, organization_id) references public.customers(id, organization_id) on delete restrict,
  check (start_date is null or due_date is null or due_date >= start_date)
);
create table public.project_members (
  project_id uuid not null, organization_id uuid not null, user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member', primary key (project_id, user_id),
  foreign key (project_id, organization_id) references public.projects(id, organization_id) on delete cascade,
  foreign key (organization_id, user_id) references public.organization_memberships(organization_id, user_id) on delete cascade
);
create table public.tasks (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid, title text not null, description text, status text not null default 'todo' check (status in ('todo','in_progress','blocked','completed')),
  priority text not null default 'normal' check (priority in ('low','normal','high','urgent')), assigned_to uuid,
  start_date date, due_date date, completed_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  foreign key (project_id, organization_id) references public.projects(id, organization_id) on delete cascade,
  foreign key (organization_id, assigned_to) references public.organization_memberships(organization_id, user_id) on delete set null (assigned_to),
  check ((status = 'completed') = (completed_at is not null)), check (start_date is null or due_date is null or due_date >= start_date)
);
create index tasks_org_status_due_idx on public.tasks(organization_id, status, due_date);

create table public.notifications (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade, title text not null, message text not null,
  type text not null default 'info', is_read boolean not null default false, action_url text, created_at timestamptz not null default now()
);
create index notifications_user_unread_idx on public.notifications(user_id, created_at desc) where is_read = false;

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null, action text not null, entity_type text not null, entity_id uuid,
  metadata jsonb not null default '{}'::jsonb, ip_address inet, created_at timestamptz not null default now()
);

create table public.organization_settings (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
  setting_key text not null, setting_value jsonb not null default '{}'::jsonb, updated_at timestamptz not null default now(), unique (organization_id, setting_key)
);

create table public.stored_files (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
  storage_path text not null unique, original_name text not null, content_type text not null, size_bytes bigint not null check (size_bytes between 1 and 10485760),
  uploaded_by uuid not null references auth.users(id) on delete restrict, created_at timestamptz not null default now()
);
create index stored_files_org_date_idx on public.stored_files(organization_id, created_at desc);

create or replace function public.is_org_member(org_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.organization_memberships m where m.organization_id = org_id and m.user_id = (select auth.uid()) and m.status = 'active' and m.role <> 'client');
$$;
create or replace function public.has_org_role(org_id uuid, allowed public.member_role[])
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.organization_memberships m where m.organization_id = org_id and m.user_id = (select auth.uid()) and m.status = 'active' and m.role = any(allowed));
$$;
revoke all on function public.is_org_member(uuid) from public;
revoke all on function public.has_org_role(uuid, public.member_role[]) from public;
grant execute on function public.is_org_member(uuid), public.has_org_role(uuid, public.member_role[]) to authenticated;

create or replace function public.create_organization(organization_name text, organization_slug text, organization_currency text default 'USD', organization_timezone text default 'UTC')
returns public.organizations language plpgsql security definer set search_path = '' as $$
declare created public.organizations;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if length(trim(organization_name)) < 2 or length(organization_name) > 120 then raise exception 'Invalid organization name' using errcode = '22023'; end if;
  if organization_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' or length(organization_slug) > 64 then raise exception 'Invalid organization slug' using errcode = '22023'; end if;
  if upper(organization_currency) not in ('USD','CAD','GBP','EUR') then raise exception 'Unsupported organization currency' using errcode = '22023'; end if;
  if length(organization_timezone) not between 1 and 80 then raise exception 'Invalid organization timezone' using errcode = '22023'; end if;
  insert into public.organizations(name, slug, default_currency, timezone)
  values(trim(organization_name), organization_slug, upper(organization_currency), organization_timezone) returning * into created;
  insert into public.organization_memberships(organization_id, user_id, role, status, joined_at)
  values(created.id, auth.uid(), 'owner', 'active', now());
  return created;
end;
$$;
revoke all on function public.create_organization(text,text,text,text) from public, anon;
grant execute on function public.create_organization(text,text,text,text) to authenticated;

create or replace function public.update_organization_settings(
  org_id uuid, organization_name text, organization_website text, organization_industry text,
  organization_company_size text, organization_currency text, organization_timezone text, organization_locale text
)
returns public.organizations language plpgsql security definer set search_path = '' as $$
declare actor_role public.member_role; organization_row public.organizations;
begin
  select m.role into actor_role from public.organization_memberships m where m.organization_id = org_id and m.user_id = auth.uid() and m.status = 'active';
  if actor_role is null or actor_role not in ('owner','admin') then raise exception 'Forbidden' using errcode = '42501'; end if;
  if length(trim(organization_name)) not between 2 and 120 or upper(organization_currency) not in ('USD','CAD','GBP','EUR') or length(organization_timezone) not between 1 and 80 or length(organization_locale) not between 2 and 10 then raise exception 'Invalid organization settings' using errcode = '22023'; end if;
  update public.organizations set name = trim(organization_name), website = nullif(trim(organization_website),''), industry = nullif(trim(organization_industry),''), company_size = nullif(trim(organization_company_size),''), default_currency = upper(organization_currency), timezone = organization_timezone, locale = organization_locale, updated_at = now()
  where id = org_id returning * into organization_row;
  if not found then raise exception 'Organization not found' using errcode = 'P0002'; end if;
  return organization_row;
end;
$$;
revoke all on function public.update_organization_settings(uuid,text,text,text,text,text,text,text) from public, anon;
grant execute on function public.update_organization_settings(uuid,text,text,text,text,text,text,text) to authenticated;

create or replace function public.application_health()
returns text language sql stable security invoker set search_path = '' as $$ select 'ok'::text; $$;
revoke all on function public.application_health() from public;
grant execute on function public.application_health() to anon, authenticated;

create or replace function public.organization_metrics(org_id uuid)
returns jsonb language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object(
    'customers', (select count(*) from public.customers c where c.organization_id = org_id),
    'activeProjects', (select count(*) from public.projects p where p.organization_id = org_id and p.status = 'active'),
    'openTasks', (select count(*) from public.tasks t where t.organization_id = org_id and t.status <> 'completed'),
    'currencies', coalesce((select jsonb_object_agg(currency, jsonb_build_object('invoiced', invoiced, 'outstanding', outstanding)) from (
      select i.currency, sum(i.total_amount) as invoiced, sum(i.balance_due) as outstanding
      from public.invoices i where i.organization_id = org_id group by i.currency
    ) totals), '{}'::jsonb)
  );
$$;
grant execute on function public.organization_metrics(uuid) to authenticated;

create or replace function public.analytics_summary(org_id uuid, range_start date, range_end date)
returns jsonb language plpgsql stable security invoker set search_path = '' as $$
begin
  if not public.is_org_member(org_id) then raise exception 'Forbidden' using errcode = '42501'; end if;
  if range_start is null or range_end is null or range_end < range_start or range_end - range_start > 1826 then raise exception 'Invalid reporting range' using errcode = '22023'; end if;
  return jsonb_build_object(
    'revenueTrend', coalesce((select jsonb_agg(jsonb_build_object('month', invoice_month, 'currency', currency, 'invoiced', invoiced, 'collected', collected) order by invoice_month, currency) from (
      select to_char(date_trunc('month', i.issue_date), 'YYYY-MM') AS invoice_month, i.currency, sum(i.total_amount) invoiced,
        coalesce((select sum(p.amount) from public.invoice_payments p where p.organization_id = org_id and p.currency = i.currency and to_char(date_trunc('month', p.payment_date), 'YYYY-MM') = to_char(date_trunc('month', i.issue_date), 'YYYY-MM') and p.status = 'recorded'), 0) collected
      from public.invoices i where i.organization_id = org_id and i.issue_date between range_start and range_end and i.status <> 'cancelled'
      group by date_trunc('month', i.issue_date), i.currency
    ) x), '[]'::jsonb),
    'collectionsTrend', coalesce((select jsonb_agg(jsonb_build_object('month', payment_month, 'currency', currency, 'collected', collected) order by payment_month, currency) from (
      select to_char(date_trunc('month', p.payment_date), 'YYYY-MM') AS payment_month, p.currency, sum(p.amount) collected
      from public.invoice_payments p where p.organization_id = org_id and p.payment_date between range_start and range_end and p.status = 'recorded'
      group by date_trunc('month', p.payment_date), p.currency
    ) x), '[]'::jsonb),
    'customerGrowth', coalesce((select jsonb_agg(jsonb_build_object('month', customer_month, 'customers', customer_count) order by customer_month) from (
      select to_char(date_trunc('month', c.created_at), 'YYYY-MM') AS customer_month, count(*) AS customer_count
      from public.customers c where c.organization_id = org_id and c.created_at::date between range_start and range_end
      group by date_trunc('month', c.created_at)
    ) x), '[]'::jsonb),
    'invoiceStatus', coalesce((select jsonb_agg(jsonb_build_object('status', status, 'count', count) order by status) from (
      select case when i.status in ('issued','partial') and i.due_date < current_date then 'overdue' else i.status end status, count(*) count
      from public.invoices i where i.organization_id = org_id and i.issue_date between range_start and range_end group by 1
    ) x), '[]'::jsonb),
    'dealPipeline', coalesce((select jsonb_agg(jsonb_build_object('stage', stage, 'currency', currency, 'deal_count', deal_count, 'value', value) order by stage, currency) from (
      select d.stage, d.currency, count(*) deal_count, sum(d.value) value from public.deals d where d.organization_id = org_id group by d.stage, d.currency
    ) x), '[]'::jsonb),
    'projectStatus', coalesce((select jsonb_agg(jsonb_build_object('status', status, 'count', count) order by status) from (
      select p.status, count(*) count from public.projects p where p.organization_id = org_id group by p.status
    ) x), '[]'::jsonb),
    'taskStatus', coalesce((select jsonb_agg(jsonb_build_object('status', status, 'count', count) order by status) from (
      select t.status, count(*) count from public.tasks t where t.organization_id = org_id group by t.status
    ) x), '[]'::jsonb)
  );
end;
$$;
grant execute on function public.analytics_summary(uuid,date,date) to authenticated;

create or replace function public.create_invoice_draft(
  org_id uuid, customer_id uuid, invoice_currency text, invoice_issue_date date, invoice_due_date date,
  line_items jsonb, discount numeric default 0, tax numeric default 0, invoice_notes text default null, invoice_terms text default null
)
returns public.invoices language plpgsql security definer set search_path = '' as $$
declare
  item jsonb; row_invoice public.invoices; subtotal_value numeric(14,2); seq bigint; invoice_year integer;
begin
  if not public.has_org_role(org_id, array['owner','admin','manager']::public.member_role[]) then raise exception 'Forbidden' using errcode = '42501'; end if;
  if invoice_currency is null or invoice_currency !~ '^[A-Z]{3}$' or invoice_issue_date is null or invoice_due_date is null or invoice_due_date < invoice_issue_date then raise exception 'Invalid invoice currency or dates' using errcode = '22023'; end if;
  if discount is null or tax is null or discount < 0 or tax < 0 or round(discount, 2) <> discount or round(tax, 2) <> tax then raise exception 'Invalid invoice adjustments' using errcode = '22023'; end if;
  if length(coalesce(invoice_notes,'')) > 2000 or length(coalesce(invoice_terms,'')) > 2000 then raise exception 'Invoice notes and terms are too long' using errcode = '22023'; end if;
  if jsonb_typeof(line_items) is distinct from 'array' then raise exception 'Invoice items must be an array' using errcode = '22023'; end if;
  if jsonb_array_length(line_items) < 1 or jsonb_array_length(line_items) > 100 then raise exception 'Invoice must have between 1 and 100 items' using errcode = '22023'; end if;
  if not exists (select 1 from public.customers c where c.id = customer_id and c.organization_id = org_id) then raise exception 'Customer not found' using errcode = '23503'; end if;
  for item in select value from jsonb_array_elements(line_items) loop
    if coalesce(length(trim(item->>'description')), 0) = 0 or length(item->>'description') > 500 then raise exception 'Invalid invoice item description' using errcode = '22023'; end if;
    if coalesce((item->>'quantity')::numeric, 0) <= 0 or coalesce((item->>'quantity')::numeric, 0) > 999999999.999 or round((item->>'quantity')::numeric, 3) <> (item->>'quantity')::numeric or coalesce((item->>'unit_price')::numeric, -1) < 0 or coalesce((item->>'unit_price')::numeric, 0) > 999999999999.99 or round((item->>'unit_price')::numeric, 2) <> (item->>'unit_price')::numeric then raise exception 'Invalid invoice item quantity or price' using errcode = '22023'; end if;
  end loop;
  select sum(round((item->>'quantity')::numeric(12,3) * (item->>'unit_price')::numeric(14,2), 2)) into subtotal_value from jsonb_array_elements(line_items) item;
  if discount > subtotal_value then raise exception 'Discount cannot exceed subtotal' using errcode = '22023'; end if;
  invoice_year := extract(year from invoice_issue_date)::integer;
  insert into public.invoice_sequences(organization_id, invoice_year, last_number) values (org_id, invoice_year, 1)
  on conflict (organization_id, invoice_year) do update set last_number = public.invoice_sequences.last_number + 1 returning last_number into seq;
  insert into public.invoices(organization_id, customer_id, invoice_number, currency, issue_date, due_date, subtotal, discount_amount, tax_amount, total_amount, status, notes, terms, created_by)
  values (org_id, customer_id, format('INV-%s-%s', invoice_year, lpad(seq::text, greatest(5, length(seq::text)), '0')), invoice_currency, invoice_issue_date, invoice_due_date, subtotal_value, discount, tax, subtotal_value - discount + tax, 'draft', invoice_notes, invoice_terms, auth.uid()) returning * into row_invoice;
  for item in select value from jsonb_array_elements(line_items) loop
    insert into public.invoice_items(invoice_id, organization_id, description, quantity, unit_price)
    values (row_invoice.id, org_id, trim(item->>'description'), (item->>'quantity')::numeric(12,3), (item->>'unit_price')::numeric(14,2));
  end loop;
  return row_invoice;
end;
$$;

create or replace function public.update_invoice_draft(
  org_id uuid, target_invoice uuid, customer_id uuid, invoice_currency text, invoice_issue_date date, invoice_due_date date,
  line_items jsonb, discount numeric default 0, tax numeric default 0, invoice_notes text default null, invoice_terms text default null
)
returns public.invoices language plpgsql security definer set search_path = '' as $$
declare item jsonb; row_invoice public.invoices; subtotal_value numeric(14,2);
begin
  if not public.has_org_role(org_id, array['owner','admin','manager']::public.member_role[]) then raise exception 'Forbidden' using errcode = '42501'; end if;
  select * into row_invoice from public.invoices i where i.id = target_invoice and i.organization_id = org_id for update;
  if not found or row_invoice.status <> 'draft' then raise exception 'Only existing draft invoices can be edited' using errcode = '23514'; end if;
  if invoice_currency is null or invoice_currency !~ '^[A-Z]{3}$' or invoice_issue_date is null or invoice_due_date is null or invoice_due_date < invoice_issue_date or discount is null or tax is null or discount < 0 or tax < 0 or round(discount, 2) <> discount or round(tax, 2) <> tax then raise exception 'Invalid invoice details' using errcode = '22023'; end if;
  if length(coalesce(invoice_notes,'')) > 2000 or length(coalesce(invoice_terms,'')) > 2000 then raise exception 'Invoice notes and terms are too long' using errcode = '22023'; end if;
  if jsonb_typeof(line_items) is distinct from 'array' then raise exception 'Invoice items must be an array' using errcode = '22023'; end if;
  if jsonb_array_length(line_items) < 1 or jsonb_array_length(line_items) > 100 then raise exception 'Invoice must have between 1 and 100 items' using errcode = '22023'; end if;
  if not exists (select 1 from public.customers c where c.id = customer_id and c.organization_id = org_id) then raise exception 'Customer not found' using errcode = '23503'; end if;
  for item in select value from jsonb_array_elements(line_items) loop
    if coalesce(length(trim(item->>'description')), 0) = 0 or length(item->>'description') > 500 or coalesce((item->>'quantity')::numeric, 0) <= 0 or coalesce((item->>'quantity')::numeric, 0) > 999999999.999 or round((item->>'quantity')::numeric, 3) <> (item->>'quantity')::numeric or coalesce((item->>'unit_price')::numeric, -1) < 0 or coalesce((item->>'unit_price')::numeric, 0) > 999999999999.99 or round((item->>'unit_price')::numeric, 2) <> (item->>'unit_price')::numeric then raise exception 'Invalid invoice item' using errcode = '22023'; end if;
  end loop;
  select sum(round((item->>'quantity')::numeric(12,3) * (item->>'unit_price')::numeric(14,2), 2)) into subtotal_value from jsonb_array_elements(line_items) item;
  if discount > subtotal_value then raise exception 'Discount cannot exceed subtotal' using errcode = '22023'; end if;
  delete from public.invoice_items where invoice_id = target_invoice and organization_id = org_id;
  for item in select value from jsonb_array_elements(line_items) loop
    insert into public.invoice_items(invoice_id, organization_id, description, quantity, unit_price)
    values (target_invoice, org_id, trim(item->>'description'), (item->>'quantity')::numeric(12,3), (item->>'unit_price')::numeric(14,2));
  end loop;
  update public.invoices set customer_id = update_invoice_draft.customer_id, currency = invoice_currency, issue_date = invoice_issue_date, due_date = invoice_due_date,
    subtotal = subtotal_value, discount_amount = discount, tax_amount = tax, total_amount = subtotal_value - discount + tax, notes = invoice_notes, terms = invoice_terms, updated_at = now()
    where id = target_invoice and organization_id = org_id returning * into row_invoice;
  return row_invoice;
end;
$$;

create or replace function public.issue_invoice(org_id uuid, target_invoice uuid)
returns public.invoices language plpgsql security definer set search_path = '' as $$
declare row_invoice public.invoices; customer_snapshot jsonb; items_snapshot jsonb;
begin
  if not public.has_org_role(org_id, array['owner','admin','manager']::public.member_role[]) then raise exception 'Forbidden' using errcode = '42501'; end if;
  select * into row_invoice from public.invoices i where i.id = target_invoice and i.organization_id = org_id for update;
  if not found or row_invoice.status <> 'draft' then raise exception 'Only draft invoices can be issued' using errcode = '23514'; end if;
  select jsonb_build_object('name', c.name, 'email', c.email, 'company_name', c.company_name, 'address', c.address, 'country', c.country) into customer_snapshot from public.customers c where c.id = row_invoice.customer_id and c.organization_id = org_id;
  select coalesce(jsonb_agg(jsonb_build_object('description', ii.description, 'quantity', ii.quantity, 'unit_price', ii.unit_price, 'line_total', ii.line_total) order by ii.id), '[]'::jsonb) into items_snapshot from public.invoice_items ii where ii.invoice_id = target_invoice and ii.organization_id = org_id;
  update public.invoices set status = 'issued', issued_snapshot = jsonb_build_object('invoice_number', row_invoice.invoice_number, 'customer', customer_snapshot, 'items', items_snapshot, 'currency', row_invoice.currency, 'issue_date', row_invoice.issue_date, 'due_date', row_invoice.due_date, 'subtotal', row_invoice.subtotal, 'discount_amount', row_invoice.discount_amount, 'tax_amount', row_invoice.tax_amount, 'total_amount', row_invoice.total_amount, 'notes', row_invoice.notes, 'terms', row_invoice.terms), updated_at = now()
    where id = target_invoice and organization_id = org_id returning * into row_invoice;
  return row_invoice;
end;
$$;

create or replace function public.record_invoice_payment(
  org_id uuid, target_invoice uuid, payment_amount numeric, payment_currency text, payment_idempotency_key uuid,
  payment_method_value text default null, payment_reference_value text default null, payment_date_value date default current_date
)
returns public.invoice_payments language plpgsql security definer set search_path = '' as $$
declare row_invoice public.invoices; row_payment public.invoice_payments;
begin
  if not public.has_org_role(org_id, array['owner','admin','manager']::public.member_role[]) then raise exception 'Forbidden' using errcode = '42501'; end if;
  if payment_idempotency_key is null then raise exception 'Payment idempotency key is required' using errcode = '22023'; end if;
  select * into row_invoice from public.invoices i where i.id = target_invoice and i.organization_id = org_id for update;
  if not found then raise exception 'Invoice not found' using errcode = 'P0002'; end if;
  select * into row_payment from public.invoice_payments p where p.organization_id = org_id and p.idempotency_key = payment_idempotency_key;
  if found then
    if row_payment.invoice_id = target_invoice and row_payment.amount = payment_amount and row_payment.currency = payment_currency then return row_payment; end if;
    raise exception 'Idempotency key already used for a different payment' using errcode = '23505';
  end if;
  if row_invoice.status not in ('issued','partial','overdue') or payment_amount is null or payment_amount <= 0 or payment_amount > 999999999999.99 or round(payment_amount, 2) <> payment_amount or payment_currency is distinct from row_invoice.currency or payment_amount > row_invoice.balance_due or payment_method_value is null or payment_method_value not in ('cash','bank_transfer','check','other') or length(coalesce(payment_reference_value,'')) > 120 or payment_date_value is null or payment_date_value > current_date then raise exception 'Payment is invalid for this invoice balance, currency, or date' using errcode = '22023'; end if;
  insert into public.invoice_payments(organization_id, invoice_id, amount, currency, payment_method, payment_reference, payment_date, idempotency_key)
    values (org_id, target_invoice, payment_amount, payment_currency, payment_method_value, payment_reference_value, payment_date_value, payment_idempotency_key) returning * into row_payment;
  update public.invoices set amount_paid = amount_paid + payment_amount,
    status = case when amount_paid + payment_amount = total_amount then 'paid' else 'partial' end, updated_at = now()
    where id = target_invoice and organization_id = org_id;
  return row_payment;
end;
$$;

create or replace function public.cancel_invoice(org_id uuid, target_invoice uuid)
returns public.invoices language plpgsql security definer set search_path = '' as $$
declare row_invoice public.invoices;
begin
  if not public.has_org_role(org_id, array['owner','admin','manager']::public.member_role[]) then raise exception 'Forbidden' using errcode = '42501'; end if;
  select * into row_invoice from public.invoices i where i.id = target_invoice and i.organization_id = org_id for update;
  if not found or row_invoice.status not in ('draft','issued') or row_invoice.amount_paid <> 0 then raise exception 'Only unpaid draft or issued invoices can be cancelled' using errcode = '23514'; end if;
  update public.invoices set status = 'cancelled', updated_at = now() where id = target_invoice and organization_id = org_id returning * into row_invoice;
  return row_invoice;
end;
$$;

revoke all on function public.create_invoice_draft(uuid,uuid,text,date,date,jsonb,numeric,numeric,text,text) from public, anon;
revoke all on function public.update_invoice_draft(uuid,uuid,uuid,text,date,date,jsonb,numeric,numeric,text,text) from public, anon;
revoke all on function public.issue_invoice(uuid,uuid) from public, anon;
revoke all on function public.record_invoice_payment(uuid,uuid,numeric,text,uuid,text,text,date) from public, anon;
revoke all on function public.cancel_invoice(uuid,uuid) from public, anon;
grant execute on function public.create_invoice_draft(uuid,uuid,text,date,date,jsonb,numeric,numeric,text,text) to authenticated;
grant execute on function public.update_invoice_draft(uuid,uuid,uuid,text,date,date,jsonb,numeric,numeric,text,text) to authenticated;
grant execute on function public.issue_invoice(uuid,uuid) to authenticated;
grant execute on function public.record_invoice_payment(uuid,uuid,numeric,text,uuid,text,text,date) to authenticated;
grant execute on function public.cancel_invoice(uuid,uuid) to authenticated;

create or replace function public.create_org_invitation(org_id uuid, invite_email text, invite_role public.member_role, token_hash text)
returns public.organization_invitations language plpgsql security definer set search_path = '' as $$
declare actor_role public.member_role; invite_row public.organization_invitations;
begin
  select m.role into actor_role from public.organization_memberships m where m.organization_id = org_id and m.user_id = auth.uid() and m.status = 'active';
  if actor_role is null or actor_role not in ('owner','admin') then raise exception 'Forbidden' using errcode = '42501'; end if;
  if invite_role not in ('admin','manager','member','viewer') or (invite_role = 'admin' and actor_role <> 'owner') then raise exception 'Invalid invite role' using errcode = '42501'; end if;
  if invite_email !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$' or token_hash !~ '^[0-9a-f]{64}$' then raise exception 'Invalid invitation details' using errcode = '22023'; end if;
  insert into public.organization_invitations(organization_id, email, role, invitation_token_hash, expires_at, invited_by)
    values (org_id, lower(trim(invite_email)), invite_role, token_hash, now() + interval '7 days', auth.uid())
    on conflict (organization_id, email) do update set role = excluded.role, invitation_token_hash = excluded.invitation_token_hash, expires_at = excluded.expires_at, accepted_at = null, revoked_at = null, invited_by = excluded.invited_by, created_at = now()
      where public.organization_invitations.accepted_at is not null or public.organization_invitations.revoked_at is not null or public.organization_invitations.expires_at <= now()
    returning * into invite_row;
  if not found then raise exception 'An active invitation already exists for this email' using errcode = '23505'; end if;
  return invite_row;
end;
$$;

create or replace function public.accept_org_invitation(org_id uuid, token_hash text)
returns public.organization_memberships language plpgsql security definer set search_path = '' as $$
declare invite_row public.organization_invitations; caller_email text; member_row public.organization_memberships;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  select lower(u.email) into caller_email from auth.users u where u.id = auth.uid();
  select * into invite_row from public.organization_invitations i where i.organization_id = org_id and i.invitation_token_hash = token_hash and i.accepted_at is null and i.revoked_at is null and i.expires_at > now() for update;
  if not found or caller_email is null or caller_email <> lower(invite_row.email) then raise exception 'Invitation is invalid, expired, or belongs to another email' using errcode = '42501'; end if;
  insert into public.organization_memberships(organization_id, user_id, role, status, joined_at)
    values (org_id, auth.uid(), invite_row.role, 'active', now())
    on conflict (organization_id, user_id) do update set role = excluded.role, status = 'active', joined_at = now()
      where public.organization_memberships.status in ('invited','suspended')
    returning * into member_row;
  if not found then
    select * into member_row from public.organization_memberships m where m.organization_id = org_id and m.user_id = auth.uid() and m.status = 'active';
    if not found then raise exception 'Membership cannot be activated' using errcode = '42501'; end if;
  end if;
  update public.organization_invitations set accepted_at = now() where id = invite_row.id;
  return member_row;
end;
$$;

create or replace function public.revoke_org_invitation(org_id uuid, invitation_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.has_org_role(org_id, array['owner','admin']::public.member_role[]) then raise exception 'Forbidden' using errcode = '42501'; end if;
  update public.organization_invitations set revoked_at = now()
    where id = invitation_id and organization_id = org_id and accepted_at is null and revoked_at is null;
  if not found then raise exception 'Invitation not found or already closed' using errcode = 'P0002'; end if;
end;
$$;

create or replace function public.set_org_member(org_id uuid, target_user uuid, new_role public.member_role, new_status public.membership_status)
returns public.organization_memberships language plpgsql security definer set search_path = '' as $$
declare actor_role public.member_role; target_row public.organization_memberships;
begin
  select m.role into actor_role from public.organization_memberships m where m.organization_id = org_id and m.user_id = auth.uid() and m.status = 'active';
  if actor_role is null or actor_role not in ('owner','admin') then raise exception 'Forbidden' using errcode = '42501'; end if;
  select * into target_row from public.organization_memberships m where m.organization_id = org_id and m.user_id = target_user for update;
  if not found or target_row.role = 'owner' or new_role = 'owner' or new_role = 'client' or new_status not in ('active','suspended') then raise exception 'Member cannot be changed' using errcode = '42501'; end if;
  if actor_role = 'admin' and (target_row.role = 'admin' or new_role = 'admin') then raise exception 'Only the owner can manage admin roles' using errcode = '42501'; end if;
  update public.organization_memberships set role = new_role, status = new_status where id = target_row.id returning * into target_row;
  return target_row;
end;
$$;

create or replace function public.remove_org_member(org_id uuid, target_user uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare actor_role public.member_role; target_role public.member_role;
begin
  select m.role into actor_role from public.organization_memberships m where m.organization_id = org_id and m.user_id = auth.uid() and m.status = 'active';
  if actor_role is null or actor_role not in ('owner','admin') then raise exception 'Forbidden' using errcode = '42501'; end if;
  select m.role into target_role from public.organization_memberships m where m.organization_id = org_id and m.user_id = target_user;
  if target_role is null or target_role = 'owner' or (actor_role = 'admin' and target_role = 'admin') then raise exception 'Member cannot be removed' using errcode = '42501'; end if;
  delete from public.organization_memberships where organization_id = org_id and user_id = target_user;
end;
$$;

revoke all on function public.create_org_invitation(uuid,text,public.member_role,text) from public, anon;
revoke all on function public.accept_org_invitation(uuid,text) from public, anon;
revoke all on function public.revoke_org_invitation(uuid,uuid) from public, anon;
revoke all on function public.set_org_member(uuid,uuid,public.member_role,public.membership_status) from public, anon;
revoke all on function public.remove_org_member(uuid,uuid) from public, anon;
grant execute on function public.create_org_invitation(uuid,text,public.member_role,text) to authenticated;
grant execute on function public.accept_org_invitation(uuid,text) to authenticated;
grant execute on function public.revoke_org_invitation(uuid,uuid) to authenticated;
grant execute on function public.set_org_member(uuid,uuid,public.member_role,public.membership_status) to authenticated;
grant execute on function public.remove_org_member(uuid,uuid) to authenticated;

create or replace function public.update_task(org_id uuid, target_task uuid, task_values jsonb)
returns public.tasks language plpgsql security definer set search_path = '' as $$
declare actor_role public.member_role; task_row public.tasks; allowed_keys text[] := array['project_id','title','description','status','priority','assigned_to','start_date','due_date'];
begin
  select m.role into actor_role from public.organization_memberships m where m.organization_id = org_id and m.user_id = auth.uid() and m.status = 'active';
  if actor_role is null or actor_role in ('client','viewer') then raise exception 'Forbidden' using errcode = '42501'; end if;
  if jsonb_typeof(task_values) is distinct from 'object' or task_values = '{}'::jsonb then raise exception 'Invalid task fields' using errcode = '22023'; end if;
  if exists (select 1 from jsonb_object_keys(task_values) k where not (k = any(allowed_keys))) then raise exception 'Invalid task fields' using errcode = '22023'; end if;
  if actor_role not in ('owner','admin','manager') and (task_values ?| array['project_id','title','description','priority','assigned_to','start_date','due_date'] or not (task_values ? 'status')) then raise exception 'Members can only update task status' using errcode = '42501'; end if;
  select * into task_row from public.tasks t where t.id = target_task and t.organization_id = org_id and (actor_role in ('owner','admin','manager') or t.assigned_to = auth.uid()) for update;
  if not found then raise exception 'Task not found' using errcode = 'P0002'; end if;
  update public.tasks set
    project_id = case when task_values ? 'project_id' then nullif(task_values->>'project_id','')::uuid else task_row.project_id end,
    title = case when task_values ? 'title' then task_values->>'title' else task_row.title end,
    description = case when task_values ? 'description' then task_values->>'description' else task_row.description end,
    status = case when task_values ? 'status' then task_values->>'status' else task_row.status end,
    priority = case when task_values ? 'priority' then task_values->>'priority' else task_row.priority end,
    assigned_to = case when task_values ? 'assigned_to' then nullif(task_values->>'assigned_to','')::uuid else task_row.assigned_to end,
    start_date = case when task_values ? 'start_date' then nullif(task_values->>'start_date','')::date else task_row.start_date end,
    due_date = case when task_values ? 'due_date' then nullif(task_values->>'due_date','')::date else task_row.due_date end,
    completed_at = case when task_values ? 'status' then case when task_values->>'status' = 'completed' then coalesce(task_row.completed_at, now()) else null end else task_row.completed_at end,
    updated_at = now()
  where id = target_task and organization_id = org_id returning * into task_row;
  return task_row;
end;
$$;
revoke all on function public.update_task(uuid,uuid,jsonb) from public, anon;
grant execute on function public.update_task(uuid,uuid,jsonb) to authenticated;

alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_memberships enable row level security;
alter table public.organization_invitations enable row level security;
alter table public.customers enable row level security;
alter table public.deals enable row level security;
alter table public.blog_categories enable row level security;
alter table public.blog_posts enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_items enable row level security;
alter table public.invoice_payments enable row level security;
alter table public.invoice_sequences enable row level security;
alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.tasks enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_logs enable row level security;
alter table public.organization_settings enable row level security;
alter table public.stored_files enable row level security;

create policy profile_self_select on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy profile_admin_select on public.profiles for select to authenticated using (exists (select 1 from public.organization_memberships m where m.user_id = profiles.id and public.has_org_role(m.organization_id, array['owner','admin']::public.member_role[])));
create policy profile_self_insert on public.profiles for insert to authenticated with check (id = (select auth.uid()));
create policy profile_self_update on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy organization_member_read on public.organizations for select to authenticated using (public.is_org_member(id));
create policy membership_self_or_admin_read on public.organization_memberships for select to authenticated using (user_id = (select auth.uid()) or public.has_org_role(organization_id, array['owner','admin']::public.member_role[]));

create policy invitations_admin_read on public.organization_invitations for select to authenticated using (public.has_org_role(organization_id, array['owner','admin']::public.member_role[]));
-- Invitation writes are performed through validated SECURITY DEFINER functions below; no direct table inserts are granted.
create policy customers_member_read on public.customers for select to authenticated using (public.has_org_role(organization_id, array['owner','admin','manager','viewer']::public.member_role[]));
create policy customers_assigned_read on public.customers for select to authenticated using (
  public.is_org_member(organization_id) and (
    exists (select 1 from public.deals d where d.customer_id = customers.id and d.organization_id = customers.organization_id and d.assigned_to = (select auth.uid()))
    or exists (select 1 from public.projects p join public.project_members pm on pm.project_id = p.id and pm.organization_id = p.organization_id where p.customer_id = customers.id and p.organization_id = customers.organization_id and pm.user_id = (select auth.uid()))
  )
);
create policy customers_manager_write on public.customers for all to authenticated using (public.has_org_role(organization_id, array['owner','admin','manager']::public.member_role[])) with check (public.has_org_role(organization_id, array['owner','admin','manager']::public.member_role[]));
create policy deals_member_read on public.deals for select to authenticated using (public.has_org_role(organization_id, array['owner','admin','manager','viewer']::public.member_role[]) or (assigned_to = (select auth.uid()) and public.is_org_member(organization_id)));
create policy deals_manager_write on public.deals for all to authenticated using (public.has_org_role(organization_id, array['owner','admin','manager']::public.member_role[])) with check (public.has_org_role(organization_id, array['owner','admin','manager']::public.member_role[]));
create policy blog_category_manager_all on public.blog_categories for all to authenticated using (public.has_org_role(organization_id, array['owner','admin','manager']::public.member_role[])) with check (public.has_org_role(organization_id, array['owner','admin','manager']::public.member_role[]));
create policy blog_category_member_read on public.blog_categories for select to authenticated using (public.is_org_member(organization_id));
create policy blog_post_read on public.blog_posts for select to authenticated using (status = 'published' and public.is_org_member(organization_id) or public.has_org_role(organization_id, array['owner','admin','manager']::public.member_role[]));
create policy blog_post_manager_write on public.blog_posts for all to authenticated using (public.has_org_role(organization_id, array['owner','admin','manager']::public.member_role[])) with check (public.has_org_role(organization_id, array['owner','admin','manager']::public.member_role[]));
create policy invoices_member_read on public.invoices for select to authenticated using (public.has_org_role(organization_id, array['owner','admin','manager','viewer']::public.member_role[]));
create policy invoice_items_member_read on public.invoice_items for select to authenticated using (public.has_org_role(organization_id, array['owner','admin','manager','viewer']::public.member_role[]));
create policy payments_member_read on public.invoice_payments for select to authenticated using (public.has_org_role(organization_id, array['owner','admin','manager','viewer']::public.member_role[]));
create policy projects_member_read on public.projects for select to authenticated using (public.has_org_role(organization_id, array['owner','admin','manager','viewer']::public.member_role[]) or exists (select 1 from public.project_members pm where pm.project_id = projects.id and pm.organization_id = projects.organization_id and pm.user_id = (select auth.uid())));
create policy projects_manager_write on public.projects for all to authenticated using (public.has_org_role(organization_id, array['owner','admin','manager']::public.member_role[])) with check (public.has_org_role(organization_id, array['owner','admin','manager']::public.member_role[]));
create policy project_members_read on public.project_members for select to authenticated using (public.is_org_member(organization_id) and (user_id = (select auth.uid()) or public.has_org_role(organization_id, array['owner','admin','manager','viewer']::public.member_role[])));
create policy project_members_manager_write on public.project_members for all to authenticated using (public.has_org_role(organization_id, array['owner','admin','manager']::public.member_role[])) with check (public.has_org_role(organization_id, array['owner','admin','manager']::public.member_role[]));
create policy tasks_member_read on public.tasks for select to authenticated using (
  public.has_org_role(organization_id, array['owner','admin','manager','viewer']::public.member_role[])
  or (assigned_to = (select auth.uid()) and public.is_org_member(organization_id))
  or exists (select 1 from public.project_members pm where pm.project_id = tasks.project_id and pm.organization_id = tasks.organization_id and pm.user_id = (select auth.uid()))
);
create policy tasks_member_update on public.tasks for update to authenticated using (public.has_org_role(organization_id, array['owner','admin','manager']::public.member_role[]) or (assigned_to = (select auth.uid()) and public.is_org_member(organization_id))) with check (public.is_org_member(organization_id));
create policy tasks_manager_insert_delete on public.tasks for all to authenticated using (public.has_org_role(organization_id, array['owner','admin','manager']::public.member_role[])) with check (public.has_org_role(organization_id, array['owner','admin','manager']::public.member_role[]));
create policy notifications_self_read on public.notifications for select to authenticated using (user_id = (select auth.uid()) and public.is_org_member(organization_id));
create policy notifications_self_update on public.notifications for update to authenticated using (user_id = (select auth.uid()) and public.is_org_member(organization_id)) with check (user_id = (select auth.uid()) and public.is_org_member(organization_id));
create policy audit_admin_read on public.audit_logs for select to authenticated using (public.has_org_role(organization_id, array['owner','admin']::public.member_role[]));
create policy settings_member_read on public.organization_settings for select to authenticated using (public.is_org_member(organization_id));
create policy settings_admin_write on public.organization_settings for all to authenticated using (public.has_org_role(organization_id, array['owner','admin']::public.member_role[])) with check (public.has_org_role(organization_id, array['owner','admin']::public.member_role[]));
create policy files_member_read on public.stored_files for select to authenticated using (public.is_org_member(organization_id));
create policy files_manager_insert on public.stored_files for insert to authenticated with check (uploaded_by = (select auth.uid()) and public.has_org_role(organization_id, array['owner','admin','manager']::public.member_role[]));
create policy files_manager_delete on public.stored_files for delete to authenticated using (public.has_org_role(organization_id, array['owner','admin','manager']::public.member_role[]));

create or replace function public.reject_audit_log_mutation()
returns trigger language plpgsql set search_path = '' as $$ begin raise exception 'Audit logs are append-only'; end; $$;
create trigger audit_logs_immutable before update or delete on public.audit_logs for each row execute function public.reject_audit_log_mutation();

create or replace function public.capture_business_activity()
returns trigger language plpgsql security definer set search_path = '' as $$
declare current_row jsonb; org_id uuid; record_id uuid; actor_id uuid; label text; display_action text; action_url text; notification_title text; member record;
begin
  current_row := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  org_id := (current_row->>'organization_id')::uuid;
  record_id := (current_row->>'id')::uuid;
  actor_id := auth.uid();
  label := coalesce(current_row->>'title', current_row->>'name', current_row->>'invoice_number', tg_table_name);
  display_action := lower(tg_op) || '_' || tg_table_name;
  action_url := case tg_table_name when 'customers' then '/customers' when 'deals' then '/crm' when 'invoices' then '/invoice' when 'projects' then '/projects' else '/tasks' end;
  notification_title := case tg_table_name when 'invoices' then 'Invoice updated' when 'tasks' then 'Task updated' when 'projects' then 'Project updated' when 'deals' then 'Deal updated' else 'Customer updated' end;
  insert into public.audit_logs(organization_id, user_id, action, entity_type, entity_id, metadata)
  values (org_id, actor_id, display_action, tg_table_name, record_id, jsonb_build_object('label', label));
  if tg_op = 'INSERT' or (tg_table_name = 'invoices' and current_row->>'status' is distinct from to_jsonb(old)->>'status') then
    for member in select m.user_id from public.organization_memberships m where m.organization_id = org_id and m.status = 'active' and m.role <> 'client' and m.user_id is distinct from actor_id loop
      insert into public.notifications(organization_id, user_id, title, message, type, action_url)
      values (org_id, member.user_id, notification_title, label || case when tg_op = 'INSERT' then ' was created.' else ' changed status to ' || coalesce(current_row->>'status','updated') || '.' end, 'info', action_url);
    end loop;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

create trigger customers_activity after insert or update or delete on public.customers for each row execute function public.capture_business_activity();
create trigger deals_activity after insert or update or delete on public.deals for each row execute function public.capture_business_activity();
create trigger invoices_activity after insert or update or delete on public.invoices for each row execute function public.capture_business_activity();
create trigger projects_activity after insert or update or delete on public.projects for each row execute function public.capture_business_activity();
create trigger tasks_activity after insert or update or delete on public.tasks for each row execute function public.capture_business_activity();

create or replace function public.reject_tenant_move()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.organization_id is distinct from old.organization_id then raise exception 'Organization ownership cannot be changed'; end if;
  return new;
end;
$$;
create trigger customers_tenant_immutable before update on public.customers for each row execute function public.reject_tenant_move();
create trigger deals_tenant_immutable before update on public.deals for each row execute function public.reject_tenant_move();
create trigger invoices_tenant_immutable before update on public.invoices for each row execute function public.reject_tenant_move();
create trigger projects_tenant_immutable before update on public.projects for each row execute function public.reject_tenant_move();
create trigger tasks_tenant_immutable before update on public.tasks for each row execute function public.reject_tenant_move();

revoke all on public.profiles, public.organizations, public.organization_memberships, public.organization_invitations,
  public.customers, public.deals, public.blog_categories, public.blog_posts, public.invoices, public.invoice_items, public.invoice_payments, public.invoice_sequences,
  public.projects, public.project_members, public.tasks, public.notifications, public.audit_logs,
  public.organization_settings, public.stored_files from anon, authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select on public.organizations to authenticated;
grant select on public.organization_memberships to authenticated;
grant select on public.organization_invitations to authenticated;
grant select, insert, update, delete on public.customers, public.deals, public.blog_categories, public.blog_posts, public.projects, public.project_members to authenticated;
grant select on public.invoices, public.invoice_items, public.invoice_payments to authenticated;
grant select, insert on public.tasks to authenticated;
grant select, update(is_read) on public.notifications to authenticated;
grant select, insert, update on public.organization_settings to authenticated;
grant select, insert, delete on public.stored_files to authenticated;
grant select on public.audit_logs to authenticated;

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('berry-private', 'berry-private', false, 10485760, array['application/pdf','image/jpeg','image/png','image/webp','text/plain','text/csv'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
create policy berry_storage_member_read on storage.objects for select to authenticated
using (bucket_id = 'berry-private' and public.is_org_member(((storage.foldername(name))[1])::uuid));
create policy berry_storage_manager_insert on storage.objects for insert to authenticated
with check (bucket_id = 'berry-private' and public.has_org_role(((storage.foldername(name))[1])::uuid, array['owner','admin','manager']::public.member_role[]));
create policy berry_storage_manager_delete on storage.objects for delete to authenticated
using (bucket_id = 'berry-private' and public.has_org_role(((storage.foldername(name))[1])::uuid, array['owner','admin','manager']::public.member_role[]));
