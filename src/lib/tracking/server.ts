import 'server-only'
import { createHash } from 'node:crypto'
import { isServiceConfigured, createServiceClient } from '@/lib/supabase/service'

const META_TOKEN = process.env.META_CAPI_TOKEN ?? ''
const META_API_VERSION = process.env.META_API_VERSION ?? 'v23.0'
const TIKTOK_TOKEN = process.env.TIKTOK_EVENTS_TOKEN ?? ''

const sha256 = (v: string) => createHash('sha256').update(v.trim().toLowerCase()).digest('hex')

type Purchase = {
  orderId: string
  valueMad: number
  quantity: number
  phone: string
  email?: string
  city: string
  ip: string
  userAgent: string
  fbp?: string
  fbc?: string
  ttp?: string
  ttclid?: string
  pageUrl?: string
}

// Server-side copies of the Purchase event (Meta Conversions API, TikTok Events
// API). They use the order id as event id, so the platforms count each
// purchase once even when the browser pixel also fires.
export async function sendServerPurchase(p: Purchase) {
  if (!isServiceConfigured || (!META_TOKEN && !TIKTOK_TOKEN)) return
  const { data: settings } = await createServiceClient()
    .from('store_settings')
    .select('meta_pixel_id, tiktok_pixel_id')
    .single()
  const eventTime = Math.floor(Date.now() / 1000)
  const jobs: Promise<unknown>[] = []

  if (META_TOKEN && settings?.meta_pixel_id) {
    jobs.push(
      post(
        `https://graph.facebook.com/${META_API_VERSION}/${settings.meta_pixel_id}/events?access_token=${encodeURIComponent(META_TOKEN)}`,
        {
          data: [
            {
              event_name: 'Purchase',
              event_time: eventTime,
              event_id: p.orderId,
              action_source: 'website',
              event_source_url: p.pageUrl,
              user_data: {
                ph: [sha256(p.phone.replace(/\D/g, ''))],
                em: p.email ? [sha256(p.email)] : undefined,
                ct: [sha256(p.city.replace(/\s+/g, ''))],
                country: [sha256('ma')],
                client_ip_address: p.ip || undefined,
                client_user_agent: p.userAgent || undefined,
                fbp: p.fbp,
                fbc: p.fbc,
              },
              custom_data: { currency: 'MAD', value: p.valueMad, num_items: p.quantity, content_type: 'product' },
            },
          ],
        },
      ),
    )
  }

  if (TIKTOK_TOKEN && settings?.tiktok_pixel_id) {
    jobs.push(
      post(
        'https://business-api.tiktok.com/open_api/v1.3/event/track/',
        {
          event_source: 'web',
          event_source_id: settings.tiktok_pixel_id,
          data: [
            {
              event: 'CompletePayment',
              event_time: eventTime,
              event_id: p.orderId,
              user: {
                phone: sha256(p.phone),
                email: p.email ? sha256(p.email) : undefined,
                ip: p.ip || undefined,
                user_agent: p.userAgent || undefined,
                ttclid: p.ttclid,
                ttp: p.ttp,
              },
              properties: { currency: 'MAD', value: p.valueMad, content_type: 'product' },
              page: p.pageUrl ? { url: p.pageUrl } : undefined,
            },
          ],
        },
        { 'Access-Token': TIKTOK_TOKEN },
      ),
    )
  }

  const results = await Promise.allSettled(jobs)
  for (const r of results) if (r.status === 'rejected') console.error('server purchase event failed', r.reason)
}

async function post(url: string, body: unknown, extraHeaders: Record<string, string> = {}) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...extraHeaders },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`${url.split('?')[0]} -> ${res.status} ${await res.text()}`)
  return res
}
