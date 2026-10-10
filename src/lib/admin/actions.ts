'use server'

import { redirect } from 'next/navigation'
import { refresh, updateTag } from 'next/cache'
import { z } from 'zod'
import { STORE_TAG } from '@/lib/catalog'
import { requireAdmin } from './auth'
import { ORDER_STATUSES, PAYMENT_STATUSES } from '@/lib/types'
import { cmiConfigured } from '@/lib/payments/cmi'

export type ActionResult = { ok: true; message?: string } | { ok: false; error: string }

const fail = (error: string): ActionResult => ({ ok: false, error })

function dbError(error: { message: string } | null, fallback = 'Enregistrement impossible.') {
  if (!error) return null
  console.error(error)
  if (error.message.includes('OUT_OF_STOCK')) return 'Stock insuffisant pour remettre cette commande en cours.'
  if (error.message.includes('duplicate key')) return 'Cette valeur existe déjà.'
  return fallback
}

export async function signOut() {
  const { supabase } = await requireAdmin()
  await supabase.auth.signOut()
  redirect('/admin/login')
}

// ---------------------------------------------------------------- Orders

export async function setOrderStatus(orderId: string, status: string, note = ''): Promise<ActionResult> {
  const { supabase } = await requireAdmin()
  if (!ORDER_STATUSES.includes(status as never)) return fail('Statut inconnu.')
  const { error } = await supabase.rpc('admin_set_order_status', { p_order_id: orderId, p_status: status, p_note: note })
  const err = dbError(error)
  if (err) return fail(err)
  // Cancelling or restoring an order changes stock shown on the shop.
  updateTag(STORE_TAG)
  refresh()
  return { ok: true }
}

export async function setPaymentStatus(orderId: string, status: string): Promise<ActionResult> {
  const { supabase } = await requireAdmin()
  if (!PAYMENT_STATUSES.includes(status as never)) return fail('Statut inconnu.')
  const { error } = await supabase.rpc('admin_set_payment_status', { p_order_id: orderId, p_status: status })
  const err = dbError(error)
  if (err) return fail(err)
  refresh()
  return { ok: true }
}

export async function saveOrderNote(orderId: string, note: string): Promise<ActionResult> {
  const { supabase, userId } = await requireAdmin()
  const text = note.trim().slice(0, 2000)
  const { error } = await supabase.from('orders').update({ admin_note: text }).eq('id', orderId)
  const err = dbError(error)
  if (err) return fail(err)
  await supabase.from('order_events').insert({ order_id: orderId, kind: 'note', message: text || '(note effacée)', created_by: userId })
  refresh()
  return { ok: true, message: 'Note enregistrée.' }
}

export async function logWhatsAppContact(orderId: string, template: string): Promise<void> {
  const { supabase, userId } = await requireAdmin()
  await supabase
    .from('order_events')
    .insert({ order_id: orderId, kind: 'notification', message: `WhatsApp ouvert : ${template}`, created_by: userId })
}

// ---------------------------------------------------------------- Product

const productSchema = z.object({
  name_fr: z.string().trim().min(1).max(120),
  name_ar: z.string().trim().min(1).max(120),
  subtitle_fr: z.string().trim().max(200),
  subtitle_ar: z.string().trim().max(200),
  description_fr: z.string().trim().max(3000),
  description_ar: z.string().trim().max(3000),
  details_fr: z.string().trim().max(3000),
  details_ar: z.string().trim().max(3000),
  size_guide_fr: z.string().trim().max(3000),
  size_guide_ar: z.string().trim().max(3000),
  price_mad: z.coerce.number().int().min(1).max(1_000_000),
  is_published: z.boolean(),
})

export async function saveProduct(productId: string, formData: FormData): Promise<ActionResult> {
  const { supabase } = await requireAdmin()
  const raw = Object.fromEntries(formData.entries())
  const parsed = productSchema.safeParse({ ...raw, is_published: formData.get('is_published') === 'on' })
  if (!parsed.success) {
    const field = parsed.error.issues[0]?.path[0]
    return fail(field === 'price_mad' ? 'Prix invalide.' : 'Vérifiez les champs obligatoires (nom en français et en arabe).')
  }
  const { error } = await supabase.from('products').update(parsed.data).eq('id', productId)
  const err = dbError(error)
  if (err) return fail(err)
  updateTag(STORE_TAG)
  refresh()
  return { ok: true, message: 'Produit enregistré. La boutique est à jour.' }
}

const createSchema = z.object({
  name_fr: z.string().trim().min(1).max(120),
  name_ar: z.string().trim().min(1).max(120),
  price_mad: z.coerce.number().int().min(1).max(1_000_000),
})

// "Le Manteau Crème" -> "le-manteau-creme"
function slugify(text: string) {
  const slug = text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/, '')
  return slug || 'produit'
}

export async function createProduct(formData: FormData): Promise<ActionResult> {
  const { supabase } = await requireAdmin()
  const parsed = createSchema.safeParse(Object.fromEntries(formData.entries()))
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.path[0] === 'price_mad' ? 'Prix invalide.' : 'Donnez un nom en français et en arabe.')
  }
  const base = slugify(parsed.data.name_fr)
  const [{ data: taken }, { data: last }] = await Promise.all([
    supabase.from('products').select('slug').like('slug', `${base}%`),
    supabase.from('products').select('position').order('position', { ascending: false }).limit(1),
  ])
  const used = new Set((taken ?? []).map((r) => r.slug))
  let slug = base
  for (let n = 2; used.has(slug); n++) slug = `${base}-${n}`

  // Starts hidden, with the usual sizes at 0 so the stock table is ready to fill.
  const { data: product, error } = await supabase
    .from('products')
    .insert({ ...parsed.data, slug, is_published: false, position: (last?.[0]?.position ?? -1) + 1 })
    .select('id')
    .single()
  const err = dbError(error)
  if (err || !product) return fail(err ?? 'Création impossible.')
  await supabase
    .from('product_sizes')
    .insert(['S', 'M', 'L', 'XL'].map((label, position) => ({ product_id: product.id, label, stock: 0, position })))
  updateTag(STORE_TAG)
  redirect(`/admin/produits/${product.id}`)
}

export async function deleteProduct(productId: string): Promise<ActionResult> {
  const { supabase } = await requireAdmin()
  const { data: product } = await supabase
    .from('products')
    .select('model_3d_path, product_images(path)')
    .eq('id', productId)
    .single<{ model_3d_path: string | null; product_images: { path: string }[] }>()
  // Past orders keep the product's name, colour and size.
  const { error } = await supabase.from('products').delete().eq('id', productId)
  const err = dbError(error)
  if (err) return fail(err)
  const files = [...(product?.product_images ?? []).map((i) => i.path), product?.model_3d_path ?? '']
    .filter((path) => path && !path.startsWith('/'))
  if (files.length) await supabase.storage.from('product-media').remove(files)
  updateTag(STORE_TAG)
  redirect('/admin/produits')
}

export async function moveProduct(productId: string, direction: -1 | 1): Promise<ActionResult> {
  const { supabase } = await requireAdmin()
  const { data, error } = await supabase.from('products').select('id, position').order('position').order('created_at')
  if (error) return fail(dbError(error)!)
  const ids = (data ?? []).map((p) => p.id)
  const i = ids.indexOf(productId)
  const j = i + direction
  if (i === -1 || j < 0 || j >= ids.length) return { ok: true }
  ;[ids[i], ids[j]] = [ids[j], ids[i]]
  for (const [position, id] of ids.entries()) {
    if (data![position]?.id === id && data![position]?.position === position) continue
    const { error: e } = await supabase.from('products').update({ position }).eq('id', id)
    if (e) return fail(dbError(e)!)
  }
  updateTag(STORE_TAG)
  refresh()
  return { ok: true }
}

const uuid = z.string().regex(/^[0-9a-f-]{36}$/i)

const variantsSchema = z.object({
  colors: z
    .array(
      z.object({
        key: z.string().min(1).max(60),
        id: uuid.optional(),
        name_fr: z.string().trim().min(1).max(60),
        name_ar: z.string().trim().max(60),
        hex: z.string().regex(/^#[0-9a-fA-F]{6}$/),
      }),
    )
    .max(20),
  sizes: z.array(z.object({ label: z.string().trim().min(1).max(20), is_active: z.boolean() })).min(1).max(30),
  // One stock figure per colour and size ("" stands for "no colour").
  cells: z
    .array(z.object({ color: z.string().max(60), size: z.number().int().min(0), id: uuid.optional(), stock: z.number().int().min(0).max(100_000) }))
    .max(600),
})

export type VariantsInput = z.input<typeof variantsSchema>

export async function saveVariants(productId: string, input: VariantsInput): Promise<ActionResult> {
  const { supabase } = await requireAdmin()
  const parsed = variantsSchema.safeParse(input)
  if (!parsed.success) return fail('Chaque couleur doit avoir un nom (FR) et chaque taille un nom et un stock (0 ou plus).')
  const { colors, sizes, cells } = parsed.data
  const unique = (values: string[]) => new Set(values.map((v) => v.toLowerCase())).size === values.length
  if (!unique(sizes.map((s) => s.label))) return fail('Deux tailles portent le même nom.')
  if (!unique(colors.map((c) => c.name_fr))) return fail('Deux couleurs portent le même nom.')
  const colorKeys = colors.length ? new Set(colors.map((c) => c.key)) : new Set([''])
  if (cells.some((c) => !colorKeys.has(c.color) || c.size >= sizes.length)) return fail('Tableau de stock invalide.')

  const [oldColors, oldRows] = await Promise.all([
    supabase.from('product_colors').select('id').eq('product_id', productId),
    supabase.from('product_sizes').select('id').eq('product_id', productId),
  ])
  if (oldColors.error || oldRows.error) return fail(dbError(oldColors.error ?? oldRows.error)!)

  // Colours: removing one also removes its sizes.
  const keptColors = new Set(colors.map((c) => c.id).filter(Boolean))
  const removedColors = (oldColors.data ?? []).map((c) => c.id).filter((id) => !keptColors.has(id))
  if (removedColors.length) {
    const { error } = await supabase.from('product_colors').delete().in('id', removedColors)
    if (error) return fail(dbError(error)!)
  }
  const colorId = new Map<string, string>()
  for (const [position, c] of colors.entries()) {
    const row = { name_fr: c.name_fr, name_ar: c.name_ar, hex: c.hex.toUpperCase(), position }
    if (c.id) {
      const { error } = await supabase.from('product_colors').update(row).eq('id', c.id).eq('product_id', productId)
      if (error) return fail(dbError(error)!)
      colorId.set(c.key, c.id)
    } else {
      const { data, error } = await supabase.from('product_colors').insert({ ...row, product_id: productId }).select('id').single()
      if (error || !data) return fail(dbError(error) ?? 'Enregistrement impossible.')
      colorId.set(c.key, data.id)
    }
  }

  // Sizes of each colour, keeping existing rows so carts and past orders stay linked.
  const keptRows = new Set(cells.map((c) => c.id).filter(Boolean))
  const removedRows = (oldRows.data ?? []).map((r) => r.id).filter((id) => !keptRows.has(id))
  if (removedRows.length) {
    const { error } = await supabase.from('product_sizes').delete().in('id', removedRows)
    if (error) return fail(dbError(error)!)
  }
  const rows = cells.map((cell) => ({
    id: cell.id,
    label: sizes[cell.size].label,
    is_active: sizes[cell.size].is_active,
    stock: cell.stock,
    position: cell.size,
    color_id: cell.color ? colorId.get(cell.color)! : null,
  }))
  // Two passes avoid clashing on the unique (colour, size) pair while renaming.
  const updates = rows.filter((r) => r.id)
  for (const [i, r] of updates.entries()) {
    const { error } = await supabase
      .from('product_sizes')
      .update({ label: `__tmp_${i}`, stock: r.stock, is_active: r.is_active, position: r.position, color_id: r.color_id })
      .eq('id', r.id!)
      .eq('product_id', productId)
    if (error) return fail(dbError(error)!)
  }
  for (const r of updates) {
    const { error } = await supabase.from('product_sizes').update({ label: r.label }).eq('id', r.id!)
    if (error) return fail(dbError(error)!)
  }
  const inserts = rows
    .filter((r) => !r.id)
    .map((r) => ({ product_id: productId, label: r.label, is_active: r.is_active, stock: r.stock, position: r.position, color_id: r.color_id }))
  if (inserts.length) {
    const { error } = await supabase.from('product_sizes').insert(inserts)
    if (error) return fail(dbError(error)!)
  }
  updateTag(STORE_TAG)
  refresh()
  return { ok: true, message: 'Couleurs, tailles et stock enregistrés.' }
}

const imageSchema = z.object({
  id: z.string(),
  role: z.enum(['gallery', 'detail']),
  alt_fr: z.string().trim().max(300),
  alt_ar: z.string().trim().max(300),
  title_fr: z.string().trim().max(120),
  title_ar: z.string().trim().max(120),
  caption_fr: z.string().trim().max(600),
  caption_ar: z.string().trim().max(600),
  color_id: uuid.nullable(),
})

export async function saveImages(images: z.input<typeof imageSchema>[]): Promise<ActionResult> {
  const { supabase } = await requireAdmin()
  const parsed = z.array(imageSchema).max(60).safeParse(images)
  if (!parsed.success) return fail('Textes des photos invalides.')
  for (const [position, { id, ...fields }] of parsed.data.entries()) {
    const { error } = await supabase.from('product_images').update({ ...fields, position }).eq('id', id)
    if (error) return fail(dbError(error)!)
  }
  updateTag(STORE_TAG)
  refresh()
  return { ok: true, message: 'Photos enregistrées.' }
}

export async function addImage(
  productId: string,
  image: { path: string; role: 'gallery' | 'detail'; width: number | null; height: number | null },
): Promise<ActionResult> {
  const { supabase } = await requireAdmin()
  if (!/^products\/[\w-]+\/[\w.-]+$/.test(image.path)) return fail('Fichier invalide.')
  const { data: last } = await supabase
    .from('product_images')
    .select('position')
    .eq('product_id', productId)
    .order('position', { ascending: false })
    .limit(1)
  const { error } = await supabase.from('product_images').insert({
    product_id: productId,
    path: image.path,
    role: image.role,
    width: image.width,
    height: image.height,
    position: (last?.[0]?.position ?? -1) + 1,
  })
  const err = dbError(error)
  if (err) return fail(err)
  updateTag(STORE_TAG)
  refresh()
  return { ok: true }
}

export async function deleteImage(imageId: string): Promise<ActionResult> {
  const { supabase } = await requireAdmin()
  const { data: img } = await supabase.from('product_images').select('path').eq('id', imageId).single()
  const { error } = await supabase.from('product_images').delete().eq('id', imageId)
  const err = dbError(error)
  if (err) return fail(err)
  if (img && !img.path.startsWith('/')) await supabase.storage.from('product-media').remove([img.path])
  updateTag(STORE_TAG)
  refresh()
  return { ok: true }
}

export async function setModel(productId: string, path: string | null): Promise<ActionResult> {
  const { supabase } = await requireAdmin()
  if (path !== null && !/^products\/[\w-]+\/[\w.-]+\.glb$/.test(path)) return fail('Fichier 3D invalide (.glb).')
  const { data: current } = await supabase.from('products').select('model_3d_path').eq('id', productId).single()
  const { error } = await supabase.from('products').update({ model_3d_path: path }).eq('id', productId)
  const err = dbError(error)
  if (err) return fail(err)
  if (current?.model_3d_path && current.model_3d_path !== path) {
    await supabase.storage.from('product-media').remove([current.model_3d_path])
  }
  updateTag(STORE_TAG)
  refresh()
  return { ok: true, message: path ? 'Modèle 3D en ligne.' : 'Modèle 3D retiré.' }
}

// ---------------------------------------------------------------- Showcase

const showcaseSchema = z.object({
  id: z.string(),
  name_fr: z.string().trim().max(120),
  name_ar: z.string().trim().max(120),
  price_mad: z.number().int().min(0).max(1_000_000),
  is_published: z.boolean(),
})

export async function saveShowcasePieces(pieces: z.input<typeof showcaseSchema>[]): Promise<ActionResult> {
  const { supabase } = await requireAdmin()
  const parsed = z.array(showcaseSchema).max(40).safeParse(pieces)
  if (!parsed.success) return fail('Pièces invalides : vérifiez les noms et les prix.')
  if (parsed.data.some((p) => p.is_published && (!p.name_fr || p.price_mad <= 0))) {
    return fail('Une pièce affichée doit avoir un nom (FR) et un prix.')
  }
  for (const [position, { id, ...fields }] of parsed.data.entries()) {
    const { error } = await supabase.from('showcase_pieces').update({ ...fields, position }).eq('id', id)
    if (error) return fail(dbError(error)!)
  }
  updateTag(STORE_TAG)
  refresh()
  return { ok: true, message: 'Vitrine enregistrée.' }
}

export async function addShowcasePiece(path: string): Promise<ActionResult> {
  const { supabase } = await requireAdmin()
  if (!/^showcase\/[\w.-]+$/.test(path)) return fail('Fichier invalide.')
  const { data: last } = await supabase
    .from('showcase_pieces')
    .select('position')
    .order('position', { ascending: false })
    .limit(1)
  // Hidden until it has a name and a price.
  const { error } = await supabase
    .from('showcase_pieces')
    .insert({ image_path: path, is_published: false, position: (last?.[0]?.position ?? -1) + 1 })
  const err = dbError(error)
  if (err) return fail(err)
  refresh()
  return { ok: true }
}

export async function deleteShowcasePiece(pieceId: string): Promise<ActionResult> {
  const { supabase } = await requireAdmin()
  const { data: piece } = await supabase.from('showcase_pieces').select('image_path').eq('id', pieceId).single()
  const { error } = await supabase.from('showcase_pieces').delete().eq('id', pieceId)
  const err = dbError(error)
  if (err) return fail(err)
  if (piece && !piece.image_path.startsWith('/')) await supabase.storage.from('product-media').remove([piece.image_path])
  updateTag(STORE_TAG)
  refresh()
  return { ok: true }
}

// ---------------------------------------------------------------- Settings

const settingsSchema = z.object({
  cod_enabled: z.boolean(),
  bank_transfer_enabled: z.boolean(),
  card_enabled: z.boolean(),
  bank_name: z.string().trim().max(120),
  bank_account_holder: z.string().trim().max(120),
  bank_rib: z.string().trim().max(60),
  whatsapp_number: z.string().trim().max(30),
  contact_email: z.union([z.literal(''), z.email()]),
  instagram_url: z.union([z.literal(''), z.url()]),
  tiktok_url: z.union([z.literal(''), z.url()]),
  facebook_url: z.union([z.literal(''), z.url()]),
  shipping_fee_mad: z.coerce.number().int().min(0).max(10000),
  notify_email_enabled: z.boolean(),
  notify_whatsapp_enabled: z.boolean(),
  notify_sms_enabled: z.boolean(),
  admin_notify_email: z.union([z.literal(''), z.email()]),
  meta_pixel_id: z.string().trim().regex(/^(\d{5,20})?$/),
  tiktok_pixel_id: z.string().trim().regex(/^([A-Za-z0-9]{5,40})?$/),
})

const SETTINGS_ERRORS: Record<string, string> = {
  whatsapp_number: 'Numéro WhatsApp invalide (ex. 06 12 34 56 78).',
  contact_email: 'E-mail de contact invalide.',
  admin_notify_email: 'E-mail de notification invalide.',
  instagram_url: 'Lien Instagram invalide (commence par https://).',
  tiktok_url: 'Lien TikTok invalide (commence par https://).',
  facebook_url: 'Lien Facebook invalide (commence par https://).',
  meta_pixel_id: 'ID du pixel Meta invalide (chiffres uniquement).',
  tiktok_pixel_id: 'ID du pixel TikTok invalide.',
  shipping_fee_mad: 'Frais de livraison invalides.',
}

const BOOLEAN_FIELDS = [
  'cod_enabled',
  'bank_transfer_enabled',
  'card_enabled',
  'notify_email_enabled',
  'notify_whatsapp_enabled',
  'notify_sms_enabled',
] as const

export async function saveSettings(formData: FormData): Promise<ActionResult> {
  const { supabase } = await requireAdmin()
  const raw: Record<string, unknown> = Object.fromEntries(formData.entries())
  for (const f of BOOLEAN_FIELDS) raw[f] = formData.get(f) === 'on'
  const parsed = settingsSchema.safeParse(raw)
  if (!parsed.success) {
    const field = String(parsed.error.issues[0]?.path[0] ?? '')
    return fail(SETTINGS_ERRORS[field] ?? 'Vérifiez les champs.')
  }
  const data = parsed.data
  let whatsapp = data.whatsapp_number.replace(/[\s().+-]/g, '')
  if (whatsapp.startsWith('00')) whatsapp = whatsapp.slice(2)
  if (/^0[5-7]\d{8}$/.test(whatsapp)) whatsapp = `212${whatsapp.slice(1)}`
  if (whatsapp && !/^\d{11,15}$/.test(whatsapp)) return fail(SETTINGS_ERRORS.whatsapp_number)
  if (data.card_enabled && !cmiConfigured) {
    return fail('Le paiement par carte demande les clés CMI (CMI_CLIENT_ID et CMI_STORE_KEY) sur le serveur.')
  }
  if (!data.cod_enabled && !data.bank_transfer_enabled && !data.card_enabled) {
    return fail('Gardez au moins un mode de paiement actif.')
  }

  const { error } = await supabase
    .from('store_settings')
    .update({ ...data, whatsapp_number: whatsapp })
    .eq('id', true)
  const err = dbError(error)
  if (err) return fail(err)
  updateTag(STORE_TAG)
  refresh()
  return { ok: true, message: 'Réglages enregistrés.' }
}
