-- Royeel store: catalog, orders, customers, settings.
-- Prices are whole dirhams (MAD). Stock is tracked per size.

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Admins
-- ---------------------------------------------------------------------------

create table public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admins where user_id = (select auth.uid()));
$$;

-- ---------------------------------------------------------------------------
-- Catalog
-- ---------------------------------------------------------------------------

create table public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name_fr text not null check (length(name_fr) between 1 and 120),
  name_ar text not null check (length(name_ar) between 1 and 120),
  subtitle_fr text not null default '',
  subtitle_ar text not null default '',
  description_fr text not null default '',
  description_ar text not null default '',
  -- One bullet point per line.
  details_fr text not null default '',
  details_ar text not null default '',
  size_guide_fr text not null default '',
  size_guide_ar text not null default '',
  color_name_fr text not null default '',
  color_name_ar text not null default '',
  color_hex text check (color_hex ~ '^#[0-9A-Fa-f]{6}$'),
  price_mad integer not null check (price_mad > 0),
  -- Storage path of a .glb file in the product-media bucket.
  model_3d_path text,
  is_published boolean not null default false,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger products_updated_at before update on public.products
  for each row execute function public.set_updated_at();

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  -- Storage path in the product-media bucket, or a site-relative URL ("/placeholders/...").
  path text not null,
  -- gallery: product photos. detail: close-ups shown as story chapters and zoomable.
  role text not null default 'gallery' check (role in ('gallery', 'detail')),
  alt_fr text not null default '',
  alt_ar text not null default '',
  title_fr text not null default '',
  title_ar text not null default '',
  caption_fr text not null default '',
  caption_ar text not null default '',
  width integer,
  height integer,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create index product_images_product_idx on public.product_images (product_id, role, position);

create table public.product_sizes (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  label text not null check (length(label) between 1 and 20),
  stock integer not null default 0 check (stock >= 0),
  position integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, label)
);

create index product_sizes_product_idx on public.product_sizes (product_id, position);

create trigger product_sizes_updated_at before update on public.product_sizes
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Customers and orders
-- ---------------------------------------------------------------------------

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  -- E.164 Moroccan mobile or landline: +2126XXXXXXXX, +2127XXXXXXXX, +2125XXXXXXXX.
  phone text not null unique check (phone ~ '^\+212[5-7][0-9]{8}$'),
  full_name text not null,
  email text,
  city text not null,
  address text not null,
  first_source text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger customers_updated_at before update on public.customers
  for each row execute function public.set_updated_at();

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number bigint generated always as identity (start with 1001) unique,
  customer_id uuid references public.customers (id) on delete set null,
  status text not null default 'new'
    check (status in ('new', 'confirmed', 'shipped', 'delivered', 'cancelled', 'exchanged')),
  payment_method text not null
    check (payment_method in ('cod', 'bank_transfer', 'card')),
  payment_status text not null default 'pending'
    check (payment_status in ('pending', 'paid', 'failed', 'refunded')),
  full_name text not null,
  phone text not null,
  email text,
  city text not null,
  address text not null,
  source text check (source in ('instagram', 'tiktok', 'facebook', 'friend', 'other')),
  -- utm_*, fbclid, ttclid captured on the landing page.
  attribution jsonb not null default '{}'::jsonb,
  locale text not null default 'fr' check (locale in ('fr', 'ar')),
  subtotal_mad integer not null check (subtotal_mad >= 0),
  shipping_mad integer not null default 0 check (shipping_mad >= 0),
  total_mad integer not null check (total_mad >= 0),
  admin_note text not null default '',
  -- Payment gateway reference (CMI transaction id).
  payment_ref text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index orders_created_idx on public.orders (created_at desc);
create index orders_status_idx on public.orders (status);
create index orders_phone_idx on public.orders (phone, created_at desc);
create index orders_customer_idx on public.orders (customer_id);

create trigger orders_updated_at before update on public.orders
  for each row execute function public.set_updated_at();

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  size_id uuid references public.product_sizes (id) on delete set null,
  product_name text not null,
  size_label text not null,
  unit_price_mad integer not null check (unit_price_mad >= 0),
  quantity integer not null check (quantity between 1 and 10)
);

create index order_items_order_idx on public.order_items (order_id);
create index order_items_size_idx on public.order_items (size_id);

-- Timeline shown on the admin order page.
create table public.order_events (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders (id) on delete cascade,
  kind text not null check (kind in ('created', 'status', 'payment', 'note', 'notification')),
  message text not null default '',
  data jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index order_events_order_idx on public.order_events (order_id, created_at);

-- ---------------------------------------------------------------------------
-- Store settings (single row)
-- ---------------------------------------------------------------------------

create table public.store_settings (
  id boolean primary key default true check (id),
  cod_enabled boolean not null default true,
  bank_transfer_enabled boolean not null default true,
  card_enabled boolean not null default false,
  bank_name text not null default '',
  bank_account_holder text not null default '',
  bank_rib text not null default '',
  -- International format without "+", e.g. 2126XXXXXXXX.
  whatsapp_number text not null default '' check (whatsapp_number ~ '^([0-9]{11,15})?$'),
  contact_email text not null default '',
  instagram_url text not null default '',
  tiktok_url text not null default '',
  facebook_url text not null default '',
  shipping_fee_mad integer not null default 0 check (shipping_fee_mad >= 0),
  notify_email_enabled boolean not null default true,
  notify_whatsapp_enabled boolean not null default false,
  notify_sms_enabled boolean not null default false,
  admin_notify_email text not null default '',
  meta_pixel_id text not null default '' check (meta_pixel_id ~ '^([0-9]{5,20})?$'),
  tiktok_pixel_id text not null default '' check (tiktok_pixel_id ~ '^([A-Za-z0-9]{5,40})?$'),
  updated_at timestamptz not null default now()
);

create trigger store_settings_updated_at before update on public.store_settings
  for each row execute function public.set_updated_at();

insert into public.store_settings (id) values (true);

-- What the storefront may know about the settings.
create or replace function public.get_public_settings()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'payments', jsonb_build_object(
      'cod', s.cod_enabled,
      'bank_transfer', s.bank_transfer_enabled,
      'card', s.card_enabled
    ),
    'whatsapp_number', s.whatsapp_number,
    'contact_email', s.contact_email,
    'instagram_url', s.instagram_url,
    'tiktok_url', s.tiktok_url,
    'facebook_url', s.facebook_url,
    'shipping_fee_mad', s.shipping_fee_mad,
    'meta_pixel_id', s.meta_pixel_id,
    'tiktok_pixel_id', s.tiktok_pixel_id
  )
  from public.store_settings s
  where s.id;
$$;

-- ---------------------------------------------------------------------------
-- Placing an order (called by the storefront with the public key)
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

    select s.id, s.label, s.stock, p.id as product_id, p.name_fr, p.price_mad
      into v_size
      from public.product_sizes s
      join public.products p on p.id = s.product_id
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

  insert into public.order_items (order_id, product_id, size_id, product_name, size_label, unit_price_mad, quantity)
  select v_order.id,
         (line ->> 'product_id')::uuid,
         (line ->> 'size_id')::uuid,
         line ->> 'product_name',
         line ->> 'size_label',
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

-- Order summary for the thank-you page. The order id is an unguessable UUID.
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
        'quantity', i.quantity,
        'unit_price_mad', i.unit_price_mad
      ) order by i.product_name, i.size_label)
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

-- ---------------------------------------------------------------------------
-- Admin operations
-- ---------------------------------------------------------------------------

-- Changes an order's status and keeps stock right: cancelling puts the items
-- back in stock, un-cancelling takes them out again.
create or replace function public.admin_set_order_status(
  p_order_id uuid,
  p_status text,
  p_note text default ''
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders;
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN';
  end if;
  if p_status not in ('new', 'confirmed', 'shipped', 'delivered', 'cancelled', 'exchanged') then
    raise exception 'INVALID_STATUS';
  end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'NOT_FOUND';
  end if;
  if v_order.status = p_status then
    return;
  end if;

  perform 1
     from public.product_sizes s
    where s.id in (select i.size_id from public.order_items i where i.order_id = p_order_id)
    order by s.id
      for update;

  if p_status = 'cancelled' then
    update public.product_sizes s
       set stock = s.stock + x.qty
      from (select size_id, sum(quantity)::integer as qty
              from public.order_items
             where order_id = p_order_id and size_id is not null
             group by size_id) x
     where s.id = x.size_id;
  elsif v_order.status = 'cancelled' then
    if exists (
      select 1
        from (select size_id, sum(quantity)::integer as qty
                from public.order_items
               where order_id = p_order_id and size_id is not null
               group by size_id) x
        join public.product_sizes s on s.id = x.size_id
       where s.stock < x.qty
    ) then
      raise exception 'OUT_OF_STOCK';
    end if;
    update public.product_sizes s
       set stock = s.stock - x.qty
      from (select size_id, sum(quantity)::integer as qty
              from public.order_items
             where order_id = p_order_id and size_id is not null
             group by size_id) x
     where s.id = x.size_id;
  end if;

  update public.orders set status = p_status where id = p_order_id;

  insert into public.order_events (order_id, kind, message, data, created_by)
  values (
    p_order_id,
    'status',
    coalesce(p_note, ''),
    jsonb_build_object('from', v_order.status, 'to', p_status),
    (select auth.uid())
  );
end;
$$;

create or replace function public.admin_set_payment_status(
  p_order_id uuid,
  p_status text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old text;
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN';
  end if;
  if p_status not in ('pending', 'paid', 'failed', 'refunded') then
    raise exception 'INVALID_STATUS';
  end if;

  select payment_status into v_old from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'NOT_FOUND';
  end if;
  if v_old = p_status then
    return;
  end if;

  update public.orders set payment_status = p_status where id = p_order_id;

  insert into public.order_events (order_id, kind, data, created_by)
  values (p_order_id, 'payment', jsonb_build_object('from', v_old, 'to', p_status), (select auth.uid()));
end;
$$;

-- Numbers for the admin dashboard. Cancelled orders are left out of revenue.
create or replace function public.admin_dashboard(p_from timestamptz, p_to timestamptz)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_result jsonb;
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN';
  end if;

  with o as (
    select * from public.orders where created_at >= p_from and created_at < p_to
  ),
  live as (
    select * from o where status <> 'cancelled'
  )
  select jsonb_build_object(
    'orders', (select count(*) from o),
    'live_orders', (select count(*) from live),
    'revenue_mad', (select coalesce(sum(total_mad), 0) from live),
    'delivered_revenue_mad', (select coalesce(sum(total_mad), 0) from live where status = 'delivered'),
    'items_sold', (select coalesce(sum(i.quantity), 0) from public.order_items i join live on live.id = i.order_id),
    'by_status', coalesce((select jsonb_object_agg(status, n) from (select status, count(*) as n from o group by status) t), '{}'::jsonb),
    'by_payment', coalesce((select jsonb_object_agg(payment_method, n) from (select payment_method, count(*) as n from live group by payment_method) t), '{}'::jsonb),
    'by_source', coalesce((
      select jsonb_agg(jsonb_build_object('source', source, 'orders', n, 'revenue_mad', rev) order by rev desc, n desc)
        from (select coalesce(source, 'unknown') as source, count(*) as n, sum(total_mad) as rev
                from live group by 1) t
    ), '[]'::jsonb),
    'by_size', coalesce((
      select jsonb_agg(jsonb_build_object('size', size_label, 'quantity', q) order by q desc)
        from (select i.size_label, sum(i.quantity) as q
                from public.order_items i join live on live.id = i.order_id
               group by i.size_label) t
    ), '[]'::jsonb),
    'by_city', coalesce((
      select jsonb_agg(jsonb_build_object('city', city, 'orders', n) order by n desc)
        from (select initcap(lower(city)) as city, count(*) as n from live group by 1 order by 2 desc limit 8) t
    ), '[]'::jsonb),
    'daily', coalesce((
      select jsonb_agg(jsonb_build_object('day', day, 'orders', n, 'revenue_mad', rev) order by day)
        from (select (created_at at time zone 'Africa/Casablanca')::date as day, count(*) as n, sum(total_mad) as rev
                from live group by 1) t
    ), '[]'::jsonb)
  ) into v_result;

  return v_result;
end;
$$;

-- Customers with their order totals (respects RLS of the caller).
create view public.customer_overview
with (security_invoker = true)
as
select
  c.id,
  c.phone,
  c.full_name,
  c.email,
  c.city,
  c.address,
  c.first_source,
  c.created_at,
  count(o.id) filter (where o.status <> 'cancelled') as orders_count,
  coalesce(sum(o.total_mad) filter (where o.status <> 'cancelled'), 0) as total_spent_mad,
  max(o.created_at) as last_order_at
from public.customers c
left join public.orders o on o.customer_id = c.id
group by c.id;

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table public.admins enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.product_sizes enable row level security;
alter table public.customers enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_events enable row level security;
alter table public.store_settings enable row level security;

create policy "admins read their own row" on public.admins
  for select to authenticated using (user_id = (select auth.uid()));

create policy "published products are public" on public.products
  for select to anon, authenticated using (is_published or (select public.is_admin()));
create policy "admins manage products" on public.products
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "images of published products are public" on public.product_images
  for select to anon, authenticated using (
    exists (select 1 from public.products p
             where p.id = product_id and (p.is_published or (select public.is_admin())))
  );
create policy "admins manage product images" on public.product_images
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "sizes of published products are public" on public.product_sizes
  for select to anon, authenticated using (
    exists (select 1 from public.products p
             where p.id = product_id and (p.is_published or (select public.is_admin())))
  );
create policy "admins manage product sizes" on public.product_sizes
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "admins manage customers" on public.customers
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admins manage orders" on public.orders
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admins manage order items" on public.order_items
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admins manage order events" on public.order_events
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admins manage settings" on public.store_settings
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

-- Explicit grants, so access does not depend on project defaults.
revoke all on all tables in schema public from anon;
grant select on public.products, public.product_images, public.product_sizes to anon;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant all on all tables in schema public to service_role;

revoke execute on all functions in schema public from public, anon;
grant execute on function public.is_admin() to anon, authenticated, service_role;
grant execute on function public.get_public_settings() to anon, authenticated, service_role;
grant execute on function
  public.place_order(text, text, text, text, text, text, text, jsonb, text, jsonb)
  to anon, authenticated, service_role;
grant execute on function public.get_order_receipt(uuid) to anon, authenticated, service_role;
grant execute on function public.admin_set_order_status(uuid, text, text) to authenticated, service_role;
grant execute on function public.admin_set_payment_status(uuid, text) to authenticated, service_role;
grant execute on function public.admin_dashboard(timestamptz, timestamptz) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Storage: product photos and 3D models (public read, admin write)
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-media',
  'product-media',
  true,
  52428800,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'model/gltf-binary']
)
on conflict (id) do nothing;

create policy "admins read product media" on storage.objects
  for select to authenticated using (bucket_id = 'product-media' and (select public.is_admin()));
create policy "admins upload product media" on storage.objects
  for insert to authenticated with check (bucket_id = 'product-media' and (select public.is_admin()));
create policy "admins update product media" on storage.objects
  for update to authenticated
  using (bucket_id = 'product-media' and (select public.is_admin()))
  with check (bucket_id = 'product-media' and (select public.is_admin()));
create policy "admins delete product media" on storage.objects
  for delete to authenticated using (bucket_id = 'product-media' and (select public.is_admin()));
