// Runs the Supabase migrations against an in-memory Postgres (PGlite) with
// minimal stand-ins for Supabase's auth/storage schemas and roles, then checks
// ordering, stock, permissions and admin operations.
//
//   node scripts/test-db.mjs

import { PGlite } from '@electric-sql/pglite'
import { readdirSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import assert from 'node:assert/strict'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const migrationsDir = join(root, 'supabase', 'migrations')

const db = new PGlite()

await db.exec(`
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;

  create schema auth;
  create table auth.users (id uuid primary key, email text);
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;
  grant usage on schema auth to anon, authenticated, service_role;
  grant execute on function auth.uid() to anon, authenticated, service_role;

  create schema storage;
  create table storage.buckets (
    id text primary key, name text, public boolean,
    file_size_limit bigint, allowed_mime_types text[]
  );
  create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
  alter table storage.objects enable row level security;

  grant usage on schema public to anon, authenticated, service_role;
`)

for (const file of readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort()) {
  await db.exec(readFileSync(join(migrationsDir, file), 'utf8'))
  console.log('applied', file)
}

let passed = 0
async function test(name, fn) {
  try {
    await fn()
    passed++
    console.log('  ok  ', name)
  } catch (error) {
    console.error('  FAIL', name)
    throw error
  }
}

// Runs a query as a given role (and user id), like PostgREST does.
async function as(role, sub, sql, params = []) {
  return db.transaction(async (tx) => {
    await tx.query(`select set_config('request.jwt.claim.sub', $1, true)`, [sub ?? ''])
    await tx.exec(`set local role ${role}`)
    return tx.query(sql, params)
  })
}

async function expectError(promise, code) {
  await assert.rejects(promise, (error) => {
    assert.match(String(error.message), new RegExp(code))
    return true
  })
}

const sizes = (await db.query(`select id, label, stock from public.product_sizes order by position`)).rows
const sizeM = sizes.find((s) => s.label === 'M')
const stockOf = async (id) =>
  (await db.query(`select stock from public.product_sizes where id = $1`, [id])).rows[0].stock

function placeOrder(overrides = {}) {
  const a = {
    name: 'Salma Bennani',
    phone: '+212612345678',
    email: 'salma@example.com',
    city: 'Casablanca',
    address: '12 rue des Orangers, Maârif',
    source: 'instagram',
    method: 'cod',
    items: [{ size_id: sizeM.id, quantity: 1 }],
    locale: 'fr',
    attribution: { utm_source: 'ig' },
    ...overrides,
  }
  return as(
    'anon',
    null,
    `select public.place_order($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10::jsonb) as r`,
    [a.name, a.phone, a.email, a.city, a.address, a.source, a.method, JSON.stringify(a.items), a.locale, JSON.stringify(a.attribution)],
  ).then((res) => res.rows[0].r)
}

console.log('\nstorefront')

await test('anon reads the published coat with its sizes and images', async () => {
  const products = await as('anon', null, `select slug, price_mad from public.products`)
  assert.equal(products.rows.length, 1)
  assert.equal(products.rows[0].price_mad, 1500)
  const s = await as('anon', null, `select count(*)::int as n from public.product_sizes`)
  assert.equal(s.rows[0].n, 4)
  const i = await as('anon', null, `select count(*)::int as n from public.product_images`)
  assert.equal(i.rows[0].n, 4)
})

await test('anon cannot read orders, customers or settings', async () => {
  await expectError(as('anon', null, `select * from public.orders`), 'permission denied')
  await expectError(as('anon', null, `select * from public.customers`), 'permission denied')
  await expectError(as('anon', null, `select * from public.store_settings`), 'permission denied')
  await expectError(as('anon', null, `select * from public.customer_overview`), 'permission denied')
})

await test('anon cannot write the catalog', async () => {
  await expectError(as('anon', null, `update public.product_sizes set stock = 99`), 'permission denied')
})

await test('anon sees the published showcase pieces only, and cannot change them', async () => {
  const r = await as('anon', null, `select name_fr, price_mad from public.showcase_pieces order by position`)
  assert.deepEqual(r.rows.map((p) => p.price_mad), [1000, 1500, 1500, 1500])
  await db.query(`insert into public.showcase_pieces (image_path, name_fr, price_mad) values ('/x.jpg', 'Brouillon', 900)`)
  const after = await as('anon', null, `select count(*)::int as n from public.showcase_pieces`)
  assert.equal(after.rows[0].n, 4)
  await db.query(`delete from public.showcase_pieces where name_fr = 'Brouillon'`)
  await expectError(as('anon', null, `update public.showcase_pieces set price_mad = 1`), 'permission denied')
  await expectError(as('anon', null, `insert into public.showcase_pieces (image_path) values ('/y.jpg')`), 'permission denied')
})

await test('public settings list the payment methods, without WhatsApp ordering', async () => {
  const r = await as('anon', null, `select public.get_public_settings() as s`)
  assert.deepEqual(Object.keys(r.rows[0].s.payments).sort(), ['bank_transfer', 'card', 'cod'])
  assert.equal(r.rows[0].s.payments.cod, true)
  assert.equal(r.rows[0].s.payments.card, false)
})

await test('anon cannot call admin functions', async () => {
  await expectError(
    as('anon', null, `select public.admin_dashboard(now() - interval '1 day', now())`),
    'permission denied',
  )
})

console.log('\nordering')

let firstOrder
await test('placing an order takes the size out of stock', async () => {
  const before = await stockOf(sizeM.id)
  firstOrder = await placeOrder()
  assert.equal(firstOrder.order_number, 1001)
  assert.equal(firstOrder.total_mad, 1500)
  assert.equal(await stockOf(sizeM.id), before - 1)
  const o = (await db.query(`select * from public.orders where id = $1`, [firstOrder.id])).rows[0]
  assert.equal(o.status, 'new')
  assert.equal(o.payment_method, 'cod')
  assert.deepEqual(o.attribution, { utm_source: 'ig' })
  const c = (await db.query(`select count(*)::int as n from public.customers`)).rows[0]
  assert.equal(c.n, 1)
})

// Enough stock for the remaining ordering checks.
await db.query(`update public.product_sizes set stock = 50 where id = $1`, [sizeM.id])

await test('the thank-you page can read the receipt', async () => {
  const r = await as('anon', null, `select public.get_order_receipt($1) as r`, [firstOrder.id])
  assert.equal(r.rows[0].r.order_number, 1001)
  assert.equal(r.rows[0].r.items[0].size_label, 'M')
  assert.equal(r.rows[0].r.bank, null)
})

await test('bad input is refused', async () => {
  await expectError(placeOrder({ phone: '0612345678' }), 'INVALID_PHONE')
  await expectError(placeOrder({ phone: '+212812345678' }), 'INVALID_PHONE')
  await expectError(placeOrder({ name: 'A' }), 'INVALID_NAME')
  await expectError(placeOrder({ email: 'not-an-email' }), 'INVALID_EMAIL')
  await expectError(placeOrder({ address: 'x' }), 'INVALID_ADDRESS')
  await expectError(placeOrder({ source: 'snapchat' }), 'INVALID_SOURCE')
  await expectError(placeOrder({ items: [] }), 'EMPTY_CART')
  await expectError(placeOrder({ items: [{ size_id: sizeM.id }] }), 'INVALID_QUANTITY')
  await expectError(placeOrder({ items: [{ size_id: sizeM.id, quantity: 6 }] }), 'INVALID_QUANTITY')
  await expectError(placeOrder({ items: [{ size_id: 'nope', quantity: 1 }] }), 'SIZE_UNAVAILABLE')
  await expectError(
    placeOrder({ items: [{ size_id: '00000000-0000-0000-0000-000000000000', quantity: 1 }] }),
    'SIZE_UNAVAILABLE',
  )
})

await test('disabled payment methods are refused', async () => {
  await expectError(placeOrder({ method: 'whatsapp' }), 'PAYMENT_METHOD_UNAVAILABLE')
  await expectError(placeOrder({ method: 'card' }), 'PAYMENT_METHOD_UNAVAILABLE')
  await expectError(placeOrder({ method: 'paypal' }), 'PAYMENT_METHOD_UNAVAILABLE')
  await expectError(placeOrder({ method: null }), 'PAYMENT_METHOD_UNAVAILABLE')
})

await test('cannot order more than what is in stock', async () => {
  const sizeXL = sizes.find((s) => s.label === 'XL')
  await db.query(`update public.product_sizes set stock = 1 where id = $1`, [sizeXL.id])
  await expectError(
    placeOrder({ phone: '+212700000001', items: [{ size_id: sizeXL.id, quantity: 2 }] }),
    'OUT_OF_STOCK',
  )
  // The same size listed twice must not slip past the check either.
  await expectError(
    placeOrder({
      phone: '+212700000001',
      items: [
        { size_id: sizeXL.id, quantity: 1 },
        { size_id: sizeXL.id, quantity: 1 },
      ],
    }),
    'OUT_OF_STOCK',
  )
  assert.equal(await stockOf(sizeXL.id), 1)
})

await test('hidden sizes and unpublished products cannot be ordered', async () => {
  const sizeS = sizes.find((s) => s.label === 'S')
  await db.query(`update public.product_sizes set is_active = false where id = $1`, [sizeS.id])
  await expectError(placeOrder({ phone: '+212700000002', items: [{ size_id: sizeS.id, quantity: 1 }] }), 'SIZE_UNAVAILABLE')
  await db.query(`update public.product_sizes set is_active = true where id = $1`, [sizeS.id])
  await db.query(`update public.products set is_published = false`)
  await expectError(placeOrder({ phone: '+212700000002' }), 'SIZE_UNAVAILABLE')
  const visible = await as('anon', null, `select count(*)::int as n from public.products`)
  assert.equal(visible.rows[0].n, 0)
  await db.query(`update public.products set is_published = true`)
})

await test('one phone number cannot place more than 3 orders in 15 minutes', async () => {
  const phone = '+212655555555'
  await placeOrder({ phone })
  await placeOrder({ phone })
  await placeOrder({ phone })
  await expectError(placeOrder({ phone }), 'TOO_MANY_ORDERS')
})

await test('bank transfer receipts include the bank details', async () => {
  await db.query(`update public.store_settings set bank_name = 'CIH', bank_account_holder = 'Royeel', bank_rib = '230 780 0000000000000000 00'`)
  const order = await placeOrder({ phone: '+212666666666', method: 'bank_transfer' })
  const r = await as('anon', null, `select public.get_order_receipt($1) as r`, [order.id])
  assert.equal(r.rows[0].r.bank.name, 'CIH')
})

await test('WhatsApp is not a way to order, even with a number set', async () => {
  await db.query(`update public.store_settings set whatsapp_number = '212612345678'`)
  await expectError(placeOrder({ phone: '+212677777777', method: 'whatsapp' }), 'PAYMENT_METHOD_UNAVAILABLE')
})

await test('a returning customer is updated, not duplicated', async () => {
  await placeOrder({ phone: '+212612345678', city: 'Rabat', email: '' })
  const c = (await db.query(`select city, email from public.customers where phone = '+212612345678'`)).rows
  assert.equal(c.length, 1)
  assert.equal(c[0].city, 'Rabat')
  assert.equal(c[0].email, 'salma@example.com')
})

console.log('\nadmin')

const adminId = '11111111-1111-1111-1111-111111111111'
const strangerId = '22222222-2222-2222-2222-222222222222'
await db.query(`insert into auth.users (id, email) values ($1, 'owner@royeel.com'), ($2, 'someone@example.com')`, [adminId, strangerId])
await db.query(`insert into public.admins (user_id) values ($1)`, [adminId])

await test('a signed-in non-admin sees nothing and cannot act', async () => {
  const r = await as('authenticated', strangerId, `select count(*)::int as n from public.orders`)
  assert.equal(r.rows[0].n, 0)
  await expectError(
    as('authenticated', strangerId, `select public.admin_set_order_status($1, 'cancelled')`, [firstOrder.id]),
    'FORBIDDEN',
  )
  await expectError(as('authenticated', strangerId, `select public.admin_dashboard(now() - interval '1 day', now())`), 'FORBIDDEN')
  const upd = await as('authenticated', strangerId, `update public.products set price_mad = 1 returning id`)
  assert.equal(upd.rows.length, 0)
})

await test('the admin sees orders and customers', async () => {
  const r = await as('authenticated', adminId, `select count(*)::int as n from public.orders`)
  assert.ok(r.rows[0].n >= 5)
  const c = await as('authenticated', adminId, `select * from public.customer_overview where phone = '+212612345678'`)
  assert.equal(Number(c.rows[0].orders_count), 2)
})

await test('cancelling puts stock back, un-cancelling takes it again', async () => {
  const before = await stockOf(sizeM.id)
  await as('authenticated', adminId, `select public.admin_set_order_status($1, 'cancelled', 'Client injoignable')`, [firstOrder.id])
  assert.equal(await stockOf(sizeM.id), before + 1)
  await as('authenticated', adminId, `select public.admin_set_order_status($1, 'confirmed')`, [firstOrder.id])
  assert.equal(await stockOf(sizeM.id), before)
  const events = (await db.query(`select kind, data from public.order_events where order_id = $1 order by id`, [firstOrder.id])).rows
  assert.deepEqual(events.map((e) => e.kind), ['created', 'status', 'status'])
  assert.deepEqual(events[1].data, { from: 'new', to: 'cancelled' })
})

await test('un-cancelling fails when the size sold out meanwhile', async () => {
  await as('authenticated', adminId, `select public.admin_set_order_status($1, 'cancelled')`, [firstOrder.id])
  await db.query(`update public.product_sizes set stock = 0 where id = $1`, [sizeM.id])
  await expectError(
    as('authenticated', adminId, `select public.admin_set_order_status($1, 'confirmed')`, [firstOrder.id]),
    'OUT_OF_STOCK',
  )
  const o = (await db.query(`select status from public.orders where id = $1`, [firstOrder.id])).rows[0]
  assert.equal(o.status, 'cancelled')
  await db.query(`update public.product_sizes set stock = 5 where id = $1`, [sizeM.id])
})

await test('the admin can mark an order as paid', async () => {
  await as('authenticated', adminId, `select public.admin_set_payment_status($1, 'paid')`, [firstOrder.id])
  const o = (await db.query(`select payment_status from public.orders where id = $1`, [firstOrder.id])).rows[0]
  assert.equal(o.payment_status, 'paid')
})

await test('the dashboard adds up live orders only', async () => {
  const r = await as('authenticated', adminId, `select public.admin_dashboard(now() - interval '1 day', now() + interval '1 minute') as d`)
  const d = r.rows[0].d
  const live = (await db.query(`select count(*)::int as n, sum(total_mad)::int as rev from public.orders where status <> 'cancelled'`)).rows[0]
  assert.equal(d.live_orders, live.n)
  assert.equal(d.revenue_mad, live.rev)
  assert.ok(d.by_source.length >= 1)
  assert.ok(d.daily.length === 1)
})

await test('the admin can edit the catalog and settings', async () => {
  const p = await as('authenticated', adminId, `update public.products set price_mad = 1490 returning price_mad`)
  assert.equal(p.rows[0].price_mad, 1490)
  const s = await as('authenticated', adminId, `update public.store_settings set card_enabled = true returning card_enabled`)
  assert.equal(s.rows[0].card_enabled, true)
  const i = await as('authenticated', adminId, `insert into public.product_sizes (product_id, label, stock) select id, 'XXL', 2 from public.products returning id`)
  assert.equal(i.rows.length, 1)
  const piece = await as('authenticated', adminId, `insert into public.showcase_pieces (image_path) values ('showcase/a.jpg') returning id, is_published`)
  assert.equal(piece.rows[0].is_published, false)
  await as('authenticated', adminId, `update public.showcase_pieces set name_fr = 'Le Manteau Noir', price_mad = 1500 where id = $1`, [piece.rows[0].id])
  const del = await as('authenticated', adminId, `delete from public.showcase_pieces where id = $1 returning id`, [piece.rows[0].id])
  assert.equal(del.rows.length, 1)
})

await test('a signed-in visitor who is not admin cannot change the showcase', async () => {
  const u = await as('authenticated', strangerId, `update public.showcase_pieces set price_mad = 1 returning id`)
  assert.equal(u.rows.length, 0)
})

console.log('\nproducts and colours')

let dress
await test('the first coat keeps its colour, and its sizes belong to it', async () => {
  const c = await as('anon', null, `select id, name_fr, hex from public.product_colors`)
  assert.equal(c.rows.length, 1)
  assert.equal(c.rows[0].name_fr, 'Bleu poudré')
  const s = await as('anon', null, `select count(*)::int as n from public.product_sizes where color_id = $1`, [c.rows[0].id])
  assert.equal(s.rows[0].n, 4)
})

await test('the admin adds a product with two colours; it shows once published', async () => {
  const p = await as(
    'authenticated',
    adminId,
    `insert into public.products (slug, name_fr, name_ar, price_mad) values ('robe-test', 'La Robe', 'الفستان', 900) returning id`,
  )
  const productId = p.rows[0].id
  const colors = await as(
    'authenticated',
    adminId,
    `insert into public.product_colors (product_id, name_fr, hex, position) values ($1, 'Noir', '#000000', 0), ($1, 'Rose', '#F4C2C2', 1) returning id, name_fr`,
    [productId],
  )
  for (const c of colors.rows) {
    await as('authenticated', adminId, `insert into public.product_sizes (product_id, color_id, label, stock) values ($1, $2, 'M', 2)`, [productId, c.id])
  }
  const hidden = await as('anon', null, `select count(*)::int as n from public.product_colors where product_id = $1`, [productId])
  assert.equal(hidden.rows[0].n, 0)
  const anySize = (await db.query(`select id from public.product_sizes where product_id = $1 limit 1`, [productId])).rows[0].id
  await expectError(placeOrder({ phone: '+212698765432', items: [{ size_id: anySize, quantity: 1 }] }), 'SIZE_UNAVAILABLE')
  await as('authenticated', adminId, `update public.products set is_published = true where id = $1`, [productId])
  const shown = await as('anon', null, `select count(*)::int as n from public.product_sizes where product_id = $1`, [productId])
  assert.equal(shown.rows[0].n, 2)
  dress = { id: productId, colors: Object.fromEntries(colors.rows.map((c) => [c.name_fr, c.id])) }
})

await test('a size or photo cannot use a colour of another product', async () => {
  const blue = (await db.query(`select id from public.product_colors where name_fr = 'Bleu poudré'`)).rows[0]
  await expectError(
    as('authenticated', adminId, `insert into public.product_sizes (product_id, color_id, label, stock) values ($1, $2, 'S', 1)`, [dress.id, blue.id]),
    'foreign key',
  )
  await expectError(
    as('authenticated', adminId, `insert into public.product_images (product_id, color_id, path) values ($1, $2, '/x.jpg')`, [dress.id, blue.id]),
    'foreign key',
  )
})

await test('one order can mix products and colours, and keeps each colour', async () => {
  const roseM = (await db.query(`select id from public.product_sizes where color_id = $1`, [dress.colors.Rose])).rows[0].id
  const blueL = (
    await db.query(
      `select s.id from public.product_sizes s join public.product_colors c on c.id = s.color_id where c.name_fr = 'Bleu poudré' and s.label = 'L'`,
    )
  ).rows[0].id
  const coatPrice = (await db.query(`select price_mad from public.products where slug = 'manteau-perle'`)).rows[0].price_mad
  const r = await placeOrder({
    phone: '+212698765432',
    items: [
      { size_id: roseM, quantity: 1 },
      { size_id: blueL, quantity: 1 },
    ],
  })
  assert.deepEqual(r.items.map((i) => i.color_name).sort(), ['Bleu poudré', 'Rose'])
  assert.equal(r.total_mad, 900 + coatPrice)
  const receipt = await as('anon', null, `select public.get_order_receipt($1) as r`, [r.id])
  assert.deepEqual(receipt.rows[0].r.items.map((i) => i.color_name).sort(), ['Bleu poudré', 'Rose'])
})

await test('deleting a colour removes its sizes; deleting a product keeps past orders', async () => {
  await as('authenticated', adminId, `delete from public.product_colors where id = $1`, [dress.colors.Noir])
  const left = (await db.query(`select count(*)::int as n from public.product_sizes where product_id = $1`, [dress.id])).rows[0].n
  assert.equal(left, 1)
  await as('authenticated', adminId, `delete from public.products where id = $1`, [dress.id])
  const lines = (await db.query(`select product_id, color_name from public.order_items where product_name = 'La Robe'`)).rows
  assert.equal(lines.length, 1)
  assert.equal(lines[0].product_id, null)
  assert.equal(lines[0].color_name, 'Rose')
})

await test('the admin editor can give colours to a product that had none, keeping its sizes', async () => {
  // The same steps saveVariants takes: new colour, rows moved to it under a
  // temporary label, then renamed back.
  const p = await as(
    'authenticated',
    adminId,
    `insert into public.products (slug, name_fr, name_ar, price_mad, is_published) values ('jupe-test', 'La Jupe', 'التنورة', 500, true) returning id`,
  )
  const productId = p.rows[0].id
  const rows = await as(
    'authenticated',
    adminId,
    `insert into public.product_sizes (product_id, label, stock, position) values ($1, 'S', 3, 0), ($1, 'M', 4, 1) returning id, label`,
    [productId],
  )
  const color = await as('authenticated', adminId, `insert into public.product_colors (product_id, name_fr, hex) values ($1, 'Crème', '#F3ECE3') returning id`, [productId])
  const colorId = color.rows[0].id
  for (const [i, r] of rows.rows.entries()) {
    await as('authenticated', adminId, `update public.product_sizes set label = $1, color_id = $2 where id = $3 and product_id = $4`, [`__tmp_${i}`, colorId, r.id, productId])
  }
  for (const r of rows.rows) {
    await as('authenticated', adminId, `update public.product_sizes set label = $1 where id = $2`, [r.label, r.id])
  }
  // A second colour gets its own S and M.
  const second = await as('authenticated', adminId, `insert into public.product_colors (product_id, name_fr, hex, position) values ($1, 'Noir', '#000000', 1) returning id`, [productId])
  await as('authenticated', adminId, `insert into public.product_sizes (product_id, color_id, label, stock, position) values ($1, $2, 'S', 1, 0), ($1, $2, 'M', 0, 1)`, [productId, second.rows[0].id])
  const after = (
    await as('anon', null, `select s.label, s.stock, c.name_fr as color from public.product_sizes s join public.product_colors c on c.id = s.color_id where s.product_id = $1 order by c.position, s.position`, [productId])
  ).rows
  assert.deepEqual(after, [
    { label: 'S', stock: 3, color: 'Crème' },
    { label: 'M', stock: 4, color: 'Crème' },
    { label: 'S', stock: 1, color: 'Noir' },
    { label: 'M', stock: 0, color: 'Noir' },
  ])
  // The same size twice in one colour is refused.
  await expectError(
    as('authenticated', adminId, `insert into public.product_sizes (product_id, color_id, label) values ($1, $2, 'S')`, [productId, colorId]),
    'duplicate key',
  )
  await as('authenticated', adminId, `delete from public.products where id = $1`, [productId])
})

console.log('\nwhatsapp confirmation')

const answer = (id, phone, reply) =>
  as('service_role', null, `select public.whatsapp_answer($1, $2, $3) as r`, [id, phone, reply]).then((res) => res.rows[0].r)

await test('visitors cannot answer for a customer', async () => {
  const order = await placeOrder({ phone: '+212633333301' })
  await db.query(`update public.orders set whatsapp_confirmation = 'sent' where id = $1`, [order.id])
  await expectError(as('anon', null, `select public.whatsapp_answer($1, '+212633333301', 'yes')`, [order.id]), 'permission denied')
  await expectError(as('authenticated', strangerId, `select public.apply_order_status($1, 'cancelled', '', null)`, [order.id]), 'permission denied')
})

await test('"Oui" confirms the order once, only from its own phone', async () => {
  const order = await placeOrder({ phone: '+212633333302' })
  // Not asked yet.
  assert.equal(await answer(order.id, '+212633333302', 'yes'), 'ignored')
  await db.query(`update public.orders set whatsapp_confirmation = 'sent' where id = $1`, [order.id])
  assert.equal(await answer(order.id, '+212600000000', 'yes'), 'ignored')
  assert.equal(await answer(order.id, '+212633333302', 'yes'), 'confirmed')
  assert.equal(await answer(order.id, '+212633333302', 'no'), 'ignored')
  const o = (await db.query(`select status, whatsapp_confirmation from public.orders where id = $1`, [order.id])).rows[0]
  assert.deepEqual(o, { status: 'confirmed', whatsapp_confirmation: 'confirmed' })
  const last = (await db.query(`select message, created_by from public.order_events where order_id = $1 order by id desc limit 1`, [order.id])).rows[0]
  assert.deepEqual(last, { message: 'Confirmée par la cliente sur WhatsApp', created_by: null })
})

await test('"Non" cancels the order and puts the stock back', async () => {
  const before = await stockOf(sizeM.id)
  const order = await placeOrder({ phone: '+212633333303' })
  assert.equal(await stockOf(sizeM.id), before - 1)
  await db.query(`update public.orders set whatsapp_confirmation = 'sent' where id = $1`, [order.id])
  assert.equal(await answer(order.id, '+212633333303', 'no'), 'declined')
  const o = (await db.query(`select status, whatsapp_confirmation from public.orders where id = $1`, [order.id])).rows[0]
  assert.deepEqual(o, { status: 'cancelled', whatsapp_confirmation: 'declined' })
  assert.equal(await stockOf(sizeM.id), before)
})

console.log(`\n${passed} checks passed`)
await db.close()
