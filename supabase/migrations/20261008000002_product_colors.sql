-- Several products, each with its own colours. Stock is kept per colour and
-- size: a product_sizes row is one size of one colour, or of the product
-- itself when it has no colours.

create table public.product_colors (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  name_fr text not null check (length(name_fr) between 1 and 60),
  name_ar text not null default '' check (length(name_ar) <= 60),
  hex text not null default '#000000' check (hex ~ '^#[0-9A-Fa-f]{6}$'),
  position integer not null default 0,
  created_at timestamptz not null default now(),
  -- Lets sizes and photos point at a colour of their own product only.
  unique (id, product_id)
);

create index product_colors_product_idx on public.product_colors (product_id, position);

alter table public.product_sizes add column color_id uuid;
alter table public.product_sizes
  add constraint product_sizes_color_fk foreign key (color_id, product_id)
  references public.product_colors (id, product_id) on delete cascade;
alter table public.product_sizes drop constraint product_sizes_product_id_label_key;
alter table public.product_sizes
  add constraint product_sizes_product_color_label_key unique nulls not distinct (product_id, color_id, label);

-- A photo can belong to one colour; photos without one show for every colour.
alter table public.product_images add column color_id uuid;
alter table public.product_images
  add constraint product_images_color_fk foreign key (color_id, product_id)
  references public.product_colors (id, product_id) on delete set null (color_id);

-- The colour is kept on each ordered line, like the product name and size.
alter table public.order_items add column color_name text not null default '';

-- The single colour each product had becomes its first colour.
with moved as (
  insert into public.product_colors (product_id, name_fr, name_ar, hex)
  select id, left(color_name_fr, 60), left(color_name_ar, 60), coalesce(color_hex, '#000000')
    from public.products
   where color_name_fr <> ''
  returning id, product_id
)
update public.product_sizes s set color_id = m.id from moved m where s.product_id = m.product_id;

alter table public.products
  drop column color_name_fr,
  drop column color_name_ar,
  drop column color_hex;

alter table public.product_colors enable row level security;

create policy "colours of published products are public" on public.product_colors
  for select to anon, authenticated
  using (exists (select 1 from public.products p
                  where p.id = product_id and (p.is_published or (select public.is_admin()))));
create policy "admins manage product colours" on public.product_colors
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

revoke all on public.product_colors from anon;
grant select on public.product_colors to anon;
grant select, insert, update, delete on public.product_colors to authenticated;
grant all on public.product_colors to service_role;

-- ---------------------------------------------------------------------------
-- Orders keep the colour of each line
-- ---------------------------------------------------------------------------

create or replace function public.place_order(
  p_full_name text,
  p_phone text,
  p_email text,
  p_city text,
  p_address text,
  p_source text,
  p_payment_method text,
  p_items jsonb,
  p_locale text default 'fr',
  p_attribution jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_settings public.store_settings;
  v_item jsonb;
  v_size record;
  v_qty integer;
  v_subtotal integer := 0;
  v_lines jsonb := '[]'::jsonb;
  v_customer_id uuid;
  v_order public.orders;
begin
  p_full_name := btrim(coalesce(p_full_name, ''));
  p_phone := btrim(coalesce(p_phone, ''));
  p_email := nullif(lower(btrim(coalesce(p_email, ''))), '');
  p_city := btrim(coalesce(p_city, ''));
  p_address := btrim(coalesce(p_address, ''));
  p_source := nullif(btrim(coalesce(p_source, '')), '');

  if length(p_full_name) not between 2 and 120 then
    raise exception 'INVALID_NAME';
  end if;
  if p_phone !~ '^\+212[5-7][0-9]{8}$' then
    raise exception 'INVALID_PHONE';
  end if;
  if p_email is not null and (length(p_email) > 200 or p_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$') then
    raise exception 'INVALID_EMAIL';
  end if;
  if length(p_city) not between 2 and 80 then
    raise exception 'INVALID_CITY';
  end if;
  if length(p_address) not between 5 and 300 then
    raise exception 'INVALID_ADDRESS';
  end if;
  if p_source is not null and p_source not in ('instagram', 'tiktok', 'facebook', 'friend', 'other') then
    raise exception 'INVALID_SOURCE';
  end if;
  if p_locale is null or p_locale not in ('fr', 'ar') then
    p_locale := 'fr';
  end if;
  if p_attribution is null or jsonb_typeof(p_attribution) <> 'object' or length(p_attribution::text) > 2000 then
    p_attribution := '{}'::jsonb;
  end if;

  select * into v_settings from public.store_settings where id;

  if p_payment_method is null
     or p_payment_method not in ('cod', 'bank_transfer', 'card')
     or (p_payment_method = 'cod' and not v_settings.cod_enabled)
     or (p_payment_method = 'bank_transfer' and not v_settings.bank_transfer_enabled)
     or (p_payment_method = 'card' and not v_settings.card_enabled) then
    raise exception 'PAYMENT_METHOD_UNAVAILABLE';
  end if;

  -- Basic protection against repeated or fake submissions.
  if (select count(*) from public.orders o
      where o.phone = p_phone and o.created_at > now() - interval '15 minutes') >= 3 then
    raise exception 'TOO_MANY_ORDERS';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) = 0 or jsonb_array_length(p_items) > 10 then
    raise exception 'EMPTY_CART';
  end if;

  -- Lock size rows in a stable order so concurrent orders cannot deadlock.
  for v_item in
    select value from jsonb_array_elements(p_items) order by value ->> 'size_id'
  loop
    if coalesce(jsonb_typeof(v_item -> 'quantity'), '') <> 'number' then
      raise exception 'INVALID_QUANTITY';
    end if;
    v_qty := (v_item ->> 'quantity')::integer;
    if v_qty < 1 or v_qty > 5 then
      raise exception 'INVALID_QUANTITY';
    end if;
    if coalesce(v_item ->> 'size_id', '') !~ '^[0-9a-fA-F-]{36}$' then
      raise exception 'SIZE_UNAVAILABLE';
    end if;

    select s.id, s.label, s.stock, p.id as product_id, p.name_fr, p.price_mad,
           coalesce(c.name_fr, '') as color_name
      into v_size
      from public.product_sizes s
      join public.products p on p.id = s.product_id
      left join public.product_colors c on c.id = s.color_id
     where s.id = (v_item ->> 'size_id')::uuid
       and s.is_active
       and p.is_published
       for update of s;

    if not found then
      raise exception 'SIZE_UNAVAILABLE';
    end if;
    if v_size.stock < v_qty then
      raise exception 'OUT_OF_STOCK';
    end if;

    update public.product_sizes set stock = stock - v_qty where id = v_size.id;

    v_subtotal := v_subtotal + v_size.price_mad * v_qty;
    v_lines := v_lines || jsonb_build_array(jsonb_build_object(
      'product_id', v_size.product_id,
      'size_id', v_size.id,
      'product_name', v_size.name_fr,
      'size_label', v_size.label,
      'color_name', v_size.color_name,
      'unit_price_mad', v_size.price_mad,
      'quantity', v_qty
    ));
  end loop;

  insert into public.customers (phone, full_name, email, city, address, first_source)
  values (p_phone, p_full_name, p_email, p_city, p_address, p_source)
  on conflict (phone) do update
    set full_name = excluded.full_name,
        email = coalesce(excluded.email, public.customers.email),
        city = excluded.city,
        address = excluded.address
  returning id into v_customer_id;

  insert into public.orders (
    customer_id, payment_method, full_name, phone, email, city, address,
    source, attribution, locale, subtotal_mad, shipping_mad, total_mad
  )
  values (
    v_customer_id, p_payment_method, p_full_name, p_phone, p_email, p_city, p_address,
    p_source, p_attribution, p_locale, v_subtotal, v_settings.shipping_fee_mad,
    v_subtotal + v_settings.shipping_fee_mad
  )
  returning * into v_order;

  insert into public.order_items (order_id, product_id, size_id, product_name, size_label, color_name, unit_price_mad, quantity)
  select v_order.id,
         (line ->> 'product_id')::uuid,
         (line ->> 'size_id')::uuid,
         line ->> 'product_name',
         line ->> 'size_label',
         line ->> 'color_name',
         (line ->> 'unit_price_mad')::integer,
         (line ->> 'quantity')::integer
    from jsonb_array_elements(v_lines) as line;

  insert into public.order_events (order_id, kind, message)
  values (v_order.id, 'created', 'Commande passée sur le site');

  return jsonb_build_object(
    'id', v_order.id,
    'order_number', v_order.order_number,
    'total_mad', v_order.total_mad,
    'items', v_lines
  );
end;
$$;

create or replace function public.get_order_receipt(p_order_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', o.id,
    'order_number', o.order_number,
    'status', o.status,
    'payment_method', o.payment_method,
    'payment_status', o.payment_status,
    'full_name', o.full_name,
    'city', o.city,
    'total_mad', o.total_mad,
    'shipping_mad', o.shipping_mad,
    'created_at', o.created_at,
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'product_name', i.product_name,
        'size_label', i.size_label,
        'color_name', i.color_name,
        'quantity', i.quantity,
        'unit_price_mad', i.unit_price_mad
      ) order by i.product_name, i.color_name, i.size_label)
      from public.order_items i where i.order_id = o.id
    ), '[]'::jsonb),
    'bank', case when o.payment_method = 'bank_transfer' then jsonb_build_object(
      'name', s.bank_name,
      'holder', s.bank_account_holder,
      'rib', s.bank_rib
    ) end,
    'whatsapp_number', nullif(s.whatsapp_number, '')
  )
  from public.orders o
  cross join public.store_settings s
  where o.id = p_order_id
    and s.id
    and o.created_at > now() - interval '60 days';
$$;
