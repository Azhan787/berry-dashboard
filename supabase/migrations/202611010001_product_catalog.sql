-- Tenant-scoped product catalogue for invoice selection.
-- Existing invoice descriptions/prices remain snapshots and are not rewritten.
create table public.products (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 180),
  description text not null default '' check (length(description) <= 1000),
  sku text check (sku is null or length(sku) <= 80),
  unit_price numeric(14,2) not null check (unit_price >= 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  unique (organization_id, sku)
);

create index products_org_active_name_idx on public.products(organization_id, active, name);

create or replace function public.touch_product_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
create trigger products_updated_at before update on public.products
  for each row execute function public.touch_product_updated_at();
create trigger products_tenant_immutable before update on public.products
  for each row execute function public.reject_tenant_move();

alter table public.invoice_items add column product_id uuid;
alter table public.invoice_items
  add constraint invoice_items_product_org_fk
  foreign key (product_id, organization_id)
  references public.products(id, organization_id)
  on delete restrict;
create index invoice_items_product_org_idx on public.invoice_items(product_id, organization_id) where product_id is not null;

alter table public.products enable row level security;
revoke all on public.products from anon, authenticated;
grant select, insert, update on public.products to authenticated;
create policy products_member_read on public.products for select to authenticated
  using (public.has_org_role(organization_id, array['owner','admin','manager','member','viewer']::public.member_role[]));
create policy products_manager_insert on public.products for insert to authenticated
  with check (public.has_org_role(organization_id, array['owner','admin','manager']::public.member_role[]));
create policy products_manager_update on public.products for update to authenticated
  using (public.has_org_role(organization_id, array['owner','admin','manager']::public.member_role[]))
  with check (public.has_org_role(organization_id, array['owner','admin','manager']::public.member_role[]));

create or replace function public.create_invoice_draft(
  org_id uuid, customer_id uuid, invoice_currency text, invoice_issue_date date, invoice_due_date date,
  line_items jsonb, discount numeric default 0, tax numeric default 0, invoice_notes text default null, invoice_terms text default null
)
returns public.invoices language plpgsql security definer set search_path = '' as $$
declare
  item jsonb; normalized_item jsonb; normalized_items jsonb := '[]'::jsonb;
  row_invoice public.invoices; subtotal_value numeric(14,2) := 0; seq bigint; invoice_year integer;
  item_product_id uuid; item_description text; item_quantity numeric(12,3); item_price numeric(14,2);
  catalog_name text; catalog_price numeric(14,2); catalog_currency text; catalog_active boolean;
begin
  if not public.has_org_role(org_id, array['owner','admin','manager']::public.member_role[]) then raise exception 'Forbidden' using errcode = '42501'; end if;
  if invoice_currency is null or invoice_currency !~ '^[A-Z]{3}$' or invoice_issue_date is null or invoice_due_date is null or invoice_due_date < invoice_issue_date then raise exception 'Invalid invoice currency or dates' using errcode = '22023'; end if;
  if discount is null or tax is null or discount < 0 or tax < 0 or round(discount, 2) <> discount or round(tax, 2) <> tax then raise exception 'Invalid invoice adjustments' using errcode = '22023'; end if;
  if length(coalesce(invoice_notes,'')) > 2000 or length(coalesce(invoice_terms,'')) > 2000 then raise exception 'Invoice notes and terms are too long' using errcode = '22023'; end if;
  if jsonb_typeof(line_items) is distinct from 'array' then raise exception 'Invoice items must be an array' using errcode = '22023'; end if;
  if jsonb_array_length(line_items) < 1 or jsonb_array_length(line_items) > 100 then raise exception 'Invoice must have between 1 and 100 items' using errcode = '22023'; end if;
  if not exists (select 1 from public.customers c where c.id = customer_id and c.organization_id = org_id) then raise exception 'Customer not found' using errcode = '23503'; end if;
  for item in select value from jsonb_array_elements(line_items) loop
    item_product_id := nullif(item->>'product_id','')::uuid;
    item_quantity := (item->>'quantity')::numeric;
    if item_product_id is null then
      item_description := trim(item->>'description');
      item_price := (item->>'unit_price')::numeric;
    else
      select p.name, p.unit_price, p.currency, p.active into catalog_name, catalog_price, catalog_currency, catalog_active
        from public.products p where p.id = item_product_id and p.organization_id = org_id;
      if not found or catalog_active is distinct from true then raise exception 'Invoice product is unavailable' using errcode = '23503'; end if;
      if catalog_currency <> invoice_currency then raise exception 'Invoice product currency must match the invoice currency' using errcode = '22023'; end if;
      item_description := catalog_name;
      item_price := catalog_price;
    end if;
    if coalesce(length(item_description), 0) = 0 or length(item_description) > 500 then raise exception 'Invalid invoice item description' using errcode = '22023'; end if;
    if coalesce(item_quantity, 0) <= 0 or item_quantity > 999999999.999 or round(item_quantity, 3) <> item_quantity or coalesce(item_price, -1) < 0 or item_price > 999999999999.99 or round(item_price, 2) <> item_price then raise exception 'Invalid invoice item quantity or price' using errcode = '22023'; end if;
    normalized_item := jsonb_build_object('product_id', item_product_id, 'description', item_description, 'quantity', item_quantity, 'unit_price', item_price);
    normalized_items := normalized_items || jsonb_build_array(normalized_item);
    subtotal_value := subtotal_value + round(item_quantity * item_price, 2);
  end loop;
  if discount > subtotal_value then raise exception 'Discount cannot exceed subtotal' using errcode = '22023'; end if;
  invoice_year := extract(year from invoice_issue_date)::integer;
  insert into public.invoice_sequences(organization_id, invoice_year, last_number) values (org_id, invoice_year, 1)
  on conflict (organization_id, invoice_year) do update set last_number = public.invoice_sequences.last_number + 1 returning last_number into seq;
  insert into public.invoices(organization_id, customer_id, invoice_number, currency, issue_date, due_date, subtotal, discount_amount, tax_amount, total_amount, status, notes, terms, created_by)
  values (org_id, customer_id, format('INV-%s-%s', invoice_year, lpad(seq::text, greatest(5, length(seq::text)), '0')), invoice_currency, invoice_issue_date, invoice_due_date, subtotal_value, discount, tax, subtotal_value - discount + tax, 'draft', invoice_notes, invoice_terms, auth.uid()) returning * into row_invoice;
  for item in select value from jsonb_array_elements(normalized_items) loop
    insert into public.invoice_items(invoice_id, organization_id, product_id, description, quantity, unit_price)
    values (row_invoice.id, org_id, nullif(item->>'product_id','')::uuid, item->>'description', (item->>'quantity')::numeric(12,3), (item->>'unit_price')::numeric(14,2));
  end loop;
  return row_invoice;
end;
$$;

create or replace function public.update_invoice_draft(
  org_id uuid, target_invoice uuid, customer_id uuid, invoice_currency text, invoice_issue_date date, invoice_due_date date,
  line_items jsonb, discount numeric default 0, tax numeric default 0, invoice_notes text default null, invoice_terms text default null
)
returns public.invoices language plpgsql security definer set search_path = '' as $$
declare
  item jsonb; normalized_item jsonb; normalized_items jsonb := '[]'::jsonb;
  row_invoice public.invoices; subtotal_value numeric(14,2) := 0;
  item_product_id uuid; item_description text; item_quantity numeric(12,3); item_price numeric(14,2);
  catalog_name text; catalog_price numeric(14,2); catalog_currency text; catalog_active boolean;
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
    item_product_id := nullif(item->>'product_id','')::uuid;
    item_quantity := (item->>'quantity')::numeric;
    if item_product_id is null then
      item_description := trim(item->>'description');
      item_price := (item->>'unit_price')::numeric;
    else
      select p.name, p.unit_price, p.currency, p.active into catalog_name, catalog_price, catalog_currency, catalog_active
        from public.products p where p.id = item_product_id and p.organization_id = org_id;
      if not found or catalog_active is distinct from true then raise exception 'Invoice product is unavailable' using errcode = '23503'; end if;
      if catalog_currency <> invoice_currency then raise exception 'Invoice product currency must match the invoice currency' using errcode = '22023'; end if;
      item_description := catalog_name;
      item_price := catalog_price;
    end if;
    if coalesce(length(item_description), 0) = 0 or length(item_description) > 500 or coalesce(item_quantity, 0) <= 0 or item_quantity > 999999999.999 or round(item_quantity, 3) <> item_quantity or coalesce(item_price, -1) < 0 or item_price > 999999999999.99 or round(item_price, 2) <> item_price then raise exception 'Invalid invoice item' using errcode = '22023'; end if;
    normalized_item := jsonb_build_object('product_id', item_product_id, 'description', item_description, 'quantity', item_quantity, 'unit_price', item_price);
    normalized_items := normalized_items || jsonb_build_array(normalized_item);
    subtotal_value := subtotal_value + round(item_quantity * item_price, 2);
  end loop;
  if discount > subtotal_value then raise exception 'Discount cannot exceed subtotal' using errcode = '22023'; end if;
  delete from public.invoice_items where invoice_id = target_invoice and organization_id = org_id;
  for item in select value from jsonb_array_elements(normalized_items) loop
    insert into public.invoice_items(invoice_id, organization_id, product_id, description, quantity, unit_price)
    values (target_invoice, org_id, nullif(item->>'product_id','')::uuid, item->>'description', (item->>'quantity')::numeric(12,3), (item->>'unit_price')::numeric(14,2));
  end loop;
  update public.invoices set customer_id = update_invoice_draft.customer_id, currency = invoice_currency, issue_date = invoice_issue_date, due_date = invoice_due_date,
    subtotal = subtotal_value, discount_amount = discount, tax_amount = tax, total_amount = subtotal_value - discount + tax, notes = invoice_notes, terms = invoice_terms, updated_at = now()
    where id = target_invoice and organization_id = org_id returning * into row_invoice;
  return row_invoice;
end;
$$;
