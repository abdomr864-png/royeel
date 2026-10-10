'use server'

import { headers } from 'next/headers'
import { after } from 'next/server'
import { updateTag } from 'next/cache'
import { z } from 'zod'
import { STORE_TAG } from '@/lib/catalog'
import { normalizeMoroccanPhone } from '@/lib/format'
import { isSupabaseConfigured } from '@/lib/supabase/env'
import { createPublicClient } from '@/lib/supabase/public'
import { notifyNewOrder } from '@/lib/notify'
import { sendServerPurchase } from '@/lib/tracking/server'
import { cmiConfigured } from '@/lib/payments/cmi'
import { ORDER_SOURCES, PAYMENT_METHODS } from '@/lib/types'

export type OrderErrorCode =
  | 'INVALID_NAME'
  | 'INVALID_PHONE'
  | 'INVALID_EMAIL'
  | 'INVALID_CITY'
  | 'INVALID_ADDRESS'
  | 'INVALID_SOURCE'
  | 'INVALID_QUANTITY'
  | 'EMPTY_CART'
  | 'SIZE_UNAVAILABLE'
  | 'OUT_OF_STOCK'
  | 'PAYMENT_METHOD_UNAVAILABLE'
  | 'TOO_MANY_ORDERS'
  | 'NOT_CONNECTED'
  | 'UNKNOWN'

export type PlaceOrderResult =
  | { ok: true; orderId: string; orderNumber: number; totalMad: number; redirectTo: string }
  | { ok: false; error: OrderErrorCode }

const KNOWN_DB_ERRORS: OrderErrorCode[] = [
  'INVALID_NAME',
  'INVALID_PHONE',
  'INVALID_EMAIL',
  'INVALID_CITY',
  'INVALID_ADDRESS',
  'INVALID_SOURCE',
  'INVALID_QUANTITY',
  'EMPTY_CART',
  'SIZE_UNAVAILABLE',
  'OUT_OF_STOCK',
  'PAYMENT_METHOD_UNAVAILABLE',
  'TOO_MANY_ORDERS',
]

const input = z.object({
  fullName: z.string().trim().min(2, 'INVALID_NAME').max(120, 'INVALID_NAME'),
  phone: z.string().max(40, 'INVALID_PHONE'),
  email: z.union([z.literal(''), z.email('INVALID_EMAIL').max(200, 'INVALID_EMAIL')]).default(''),
  city: z.string().trim().min(2, 'INVALID_CITY').max(80, 'INVALID_CITY'),
  address: z.string().trim().min(5, 'INVALID_ADDRESS').max(300, 'INVALID_ADDRESS'),
  source: z.enum(ORDER_SOURCES, 'INVALID_SOURCE').nullable(),
  paymentMethod: z.enum(PAYMENT_METHODS, 'PAYMENT_METHOD_UNAVAILABLE'),
  items: z
    .array(
      z.object({
        sizeId: z.string().regex(/^[0-9a-f-]{36}$/i, 'SIZE_UNAVAILABLE'),
        quantity: z.number().int('INVALID_QUANTITY').min(1, 'INVALID_QUANTITY').max(5, 'INVALID_QUANTITY'),
      }),
    )
    .min(1, 'EMPTY_CART')
    .max(10, 'EMPTY_CART'),
  locale: z.enum(['fr', 'ar']),
  attribution: z.record(z.string(), z.string().max(300)).default({}),
  // Honeypot: real visitors never see or fill this field.
  website: z.string().max(0).optional(),
  fbp: z.string().max(200).optional(),
  fbc: z.string().max(300).optional(),
  ttp: z.string().max(200).optional(),
  pageUrl: z.string().max(500).optional(),
})

export type PlaceOrderInput = z.input<typeof input>

export async function placeOrder(raw: PlaceOrderInput): Promise<PlaceOrderResult> {
  if (!isSupabaseConfigured) return { ok: false, error: 'NOT_CONNECTED' }
  const parsed = input.safeParse(raw)
  if (!parsed.success) {
    const code = parsed.error.issues[0]?.message as OrderErrorCode
    return { ok: false, error: KNOWN_DB_ERRORS.includes(code) ? code : 'UNKNOWN' }
  }
  const data = parsed.data
  if (data.website) return { ok: false, error: 'UNKNOWN' }
  if (data.paymentMethod === 'card' && !cmiConfigured) return { ok: false, error: 'PAYMENT_METHOD_UNAVAILABLE' }

  const phone = normalizeMoroccanPhone(data.phone)
  if (!phone) return { ok: false, error: 'INVALID_PHONE' }

  const attribution = Object.fromEntries(Object.entries(data.attribution).slice(0, 12))

  const supabase = createPublicClient()
  const { data: result, error } = await supabase.rpc('place_order', {
    p_full_name: data.fullName,
    p_phone: phone,
    p_email: data.email,
    p_city: data.city,
    p_address: data.address,
    p_source: data.source,
    p_payment_method: data.paymentMethod,
    p_items: data.items.map((i) => ({ size_id: i.sizeId, quantity: i.quantity })),
    p_locale: data.locale,
    p_attribution: attribution,
  })

  if (error) {
    const code = KNOWN_DB_ERRORS.find((c) => error.message.includes(c))
    if (!code) console.error('place_order failed', error)
    return { ok: false, error: code ?? 'UNKNOWN' }
  }

  const order = result as {
    id: string
    order_number: number
    total_mad: number
    items: { quantity: number }[]
  }

  // Stock changed: refresh the cached storefront.
  updateTag(STORE_TAG)

  const h = await headers()
  const ip = (h.get('x-nf-client-connection-ip') ?? h.get('x-forwarded-for') ?? '').split(',')[0].trim()
  const userAgent = h.get('user-agent') ?? ''

  // Confirmation messages and ad-platform events run after the response is sent.
  after(async () => {
    await Promise.allSettled([
      notifyNewOrder(order.id),
      sendServerPurchase({
        orderId: order.id,
        valueMad: order.total_mad,
        quantity: order.items.reduce((n, i) => n + i.quantity, 0),
        phone,
        email: data.email || undefined,
        city: data.city,
        ip,
        userAgent,
        fbp: data.fbp,
        fbc: data.fbc,
        ttp: data.ttp,
        ttclid: data.attribution.ttclid,
        pageUrl: data.pageUrl,
      }),
    ])
  })

  return {
    ok: true,
    orderId: order.id,
    orderNumber: order.order_number,
    totalMad: order.total_mad,
    redirectTo:
      data.paymentMethod === 'card'
        ? `/api/payments/cmi/start?order=${order.id}`
        : `/${data.locale}/merci/${order.id}`,
  }
}
