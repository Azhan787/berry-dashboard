-- Replace the manually applied invoice draft RPC while preserving its signature,
-- security properties, permissions, sequence key, and invoice number format.
create or replace function public.create_invoice_draft(
  org_id uuid,
  customer_id uuid,
  invoice_currency text,
  invoice_issue_date date,
  invoice_due_date date,
  line_items jsonb,
  discount numeric default 0,
  tax numeric default 0,
  invoice_notes text default null,
  invoice_terms text default null
)
returns public.invoices
language plpgsql
security definer
set search_path = ''
as $$
declare
  item jsonb;
  normalized_item jsonb;
  normalized_items jsonb := '[]'::jsonb;
  row_invoice public.invoices;
  subtotal_value numeric(14,2) := 0;
  seq bigint;
  v_invoice_year integer;
  item_product_id uuid;
  item_description text;
  item_quantity numeric(12,3);
  item_price numeric(14,2);
  catalog_name text;
  catalog_price numeric(14,2);
  catalog_currency text;
  catalog_active boolean;
begin
  if not public.has_org_role(org_id, array['owner','admin','manager']::public.member_role[]) then
    raise exception 'Forbidden' using errcode = '42501';
  end if;

  if invoice_currency is null
     or invoice_currency !~ '^[A-Z]{3}$'
     or invoice_issue_date is null
     or invoice_due_date is null
     or invoice_due_date < invoice_issue_date then
    raise exception 'Invalid invoice currency or dates' using errcode = '22023';
  end if;

  if discount is null
     or tax is null
     or discount < 0
     or tax < 0
     or round(discount, 2) <> discount
     or round(tax, 2) <> tax then
    raise exception 'Invalid invoice adjustments' using errcode = '22023';
  end if;

  if length(coalesce(invoice_notes, '')) > 2000
     or length(coalesce(invoice_terms, '')) > 2000 then
    raise exception 'Invoice notes and terms are too long' using errcode = '22023';
  end if;

  if jsonb_typeof(line_items) is distinct from 'array' then
    raise exception 'Invoice items must be an array' using errcode = '22023';
  end if;

  if jsonb_array_length(line_items) < 1 or jsonb_array_length(line_items) > 100 then
    raise exception 'Invoice must have between 1 and 100 items' using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.customers as c
    where c.id = customer_id
      and c.organization_id = org_id
  ) then
    raise exception 'Customer not found' using errcode = '23503';
  end if;

  for item in
    select line.value
    from jsonb_array_elements(line_items) as line(value)
  loop
    item_product_id := nullif(item->>'product_id', '')::uuid;
    item_quantity := (item->>'quantity')::numeric;

    if item_product_id is null then
      item_description := trim(item->>'description');
      item_price := (item->>'unit_price')::numeric;
    else
      select p.name, p.unit_price, p.currency, p.active
      into catalog_name, catalog_price, catalog_currency, catalog_active
      from public.products as p
      where p.id = item_product_id
        and p.organization_id = org_id;

      if not found or catalog_active is distinct from true then
        raise exception 'Invoice product is unavailable' using errcode = '23503';
      end if;
      if catalog_currency <> invoice_currency then
        raise exception 'Invoice product currency must match the invoice currency' using errcode = '22023';
      end if;

      item_description := catalog_name;
      item_price := catalog_price;
    end if;

    if coalesce(length(item_description), 0) = 0 or length(item_description) > 500 then
      raise exception 'Invalid invoice item description' using errcode = '22023';
    end if;
    if coalesce(item_quantity, 0) <= 0
       or item_quantity > 999999999.999
       or round(item_quantity, 3) <> item_quantity
       or coalesce(item_price, -1) < 0
       or item_price > 999999999999.99
       or round(item_price, 2) <> item_price then
      raise exception 'Invalid invoice item quantity or price' using errcode = '22023';
    end if;

    normalized_item := jsonb_build_object(
      'product_id', item_product_id,
      'description', item_description,
      'quantity', item_quantity,
      'unit_price', item_price
    );
    normalized_items := normalized_items || jsonb_build_array(normalized_item);
    subtotal_value := subtotal_value + round(item_quantity * item_price, 2);
  end loop;

  if discount > subtotal_value then
    raise exception 'Discount cannot exceed subtotal' using errcode = '22023';
  end if;

  v_invoice_year := extract(year from invoice_issue_date)::integer;
  insert into public.invoice_sequences as invoice_sequence (organization_id, invoice_year, last_number)
  values (org_id, v_invoice_year, 1)
  on conflict (organization_id, invoice_year)
  do update set last_number = invoice_sequence.last_number + 1
  returning invoice_sequence.last_number into seq;

  insert into public.invoices (
    organization_id, customer_id, invoice_number, currency, issue_date, due_date,
    subtotal, discount_amount, tax_amount, total_amount, status, notes, terms, created_by
  )
  values (
    org_id,
    customer_id,
    format('INV-%s-%s', v_invoice_year, lpad(seq::text, greatest(5, length(seq::text)), '0')),
    invoice_currency,
    invoice_issue_date,
    invoice_due_date,
    subtotal_value,
    discount,
    tax,
    subtotal_value - discount + tax,
    'draft',
    invoice_notes,
    invoice_terms,
    auth.uid()
  )
  returning * into row_invoice;

  for item in
    select normalized.value
    from jsonb_array_elements(normalized_items) as normalized(value)
  loop
    insert into public.invoice_items (
      invoice_id, organization_id, product_id, description, quantity, unit_price
    )
    values (
      row_invoice.id,
      org_id,
      nullif(item->>'product_id', '')::uuid,
      item->>'description',
      (item->>'quantity')::numeric(12,3),
      (item->>'unit_price')::numeric(14,2)
    );
  end loop;

  return row_invoice;
end;
$$;
