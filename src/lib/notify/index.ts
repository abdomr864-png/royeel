import 'server-only'
import { createServiceClient, isServiceConfigured } from '@/lib/supabase/service'
import { formatPrice, orderRef } from '@/lib/format'
import { dictionaryFor } from '@/lib/i18n/dictionaries'
import type { Locale } from '@/lib/i18n/config'
import type { PaymentMethod } from '@/lib/types'
import { sendConfirmationTemplate, whatsappConfigured } from '@/lib/whatsapp'
import { orderEmailHtml } from './email-template'

const RESEND_API_KEY = process.env.RESEND_API_KEY ?? ''
const EMAIL_FROM = process.env.EMAIL_FROM ?? ''
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID ?? ''
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN ?? ''
const TWILIO_FROM = process.env.TWILIO_FROM ?? ''
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? ''

// Which channels have their API keys set. The admin panel shows this next to
// each on/off switch.
export const channelsConfigured = {
  email: Boolean(RESEND_API_KEY && EMAIL_FROM),
  whatsapp: whatsappConfigured,
  sms: Boolean(TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_FROM),
}

type OrderRow = {
  id: string
  order_number: number
  full_name: string
  phone: string
  email: string | null
  city: string
  address: string
  locale: Locale
  payment_method: PaymentMethod
  total_mad: number
  shipping_mad: number
  order_items: { product_name: string; size_label: string; color_name: string; quantity: number; unit_price_mad: number }[]
}

// Sends the order confirmations that are switched on in the admin settings
// and logs each attempt on the order's timeline.
export async function notifyNewOrder(orderId: string) {
  if (!isServiceConfigured) return
  const supabase = createServiceClient()
  const [{ data: order }, { data: settings }] = await Promise.all([
    supabase.from('orders').select('*, order_items(*)').eq('id', orderId).single<OrderRow>(),
    supabase.from('store_settings').select('*').single(),
  ])
  if (!order || !settings) return

  const jobs: { channel: string; run: () => Promise<unknown> }[] = []
  if (settings.notify_email_enabled && channelsConfigured.email) {
    if (order.email) jobs.push({ channel: 'e-mail client', run: () => sendCustomerEmail(order, settings) })
    if (settings.admin_notify_email) {
      jobs.push({ channel: 'e-mail admin', run: () => sendAdminEmail(order, settings.admin_notify_email) })
    }
  }
  if (settings.notify_whatsapp_enabled && channelsConfigured.whatsapp) {
    jobs.push({ channel: 'WhatsApp', run: () => askConfirmation(order, supabase) })
  }
  if (settings.notify_sms_enabled && channelsConfigured.sms) {
    jobs.push({ channel: 'SMS', run: () => sendSms(order) })
  }
  if (jobs.length === 0) return

  const results = await Promise.allSettled(jobs.map((j) => j.run()))
  const events = results.map((r, i) => ({
    order_id: order.id,
    kind: 'notification',
    message: `${jobs[i].channel} : ${r.status === 'fulfilled' ? 'envoyé' : 'échec'}`,
    data: r.status === 'rejected' ? { error: String(r.reason).slice(0, 500) } : {},
  }))
  for (const r of results) if (r.status === 'rejected') console.error('notification failed', r.reason)
  await supabase.from('order_events').insert(events)
}

function sendCustomerEmail(order: OrderRow, settings: { bank_name: string; bank_account_holder: string; bank_rib: string; whatsapp_number: string }) {
  const t = dictionaryFor(order.locale)
  return sendEmail({
    to: order.email!,
    subject: `${t.thanks.title} — ${t.thanks.number} ${orderRef(order.order_number)}`,
    html: orderEmailHtml({
      order,
      locale: order.locale,
      bank: order.payment_method === 'bank_transfer' ? settings : null,
      whatsappNumber: settings.whatsapp_number,
      siteUrl: SITE_URL,
    }),
  })
}

function sendAdminEmail(order: OrderRow, to: string) {
  const items = order.order_items.map((i) => `${i.quantity} × ${i.product_name} (${[i.color_name, i.size_label].filter(Boolean).join(', ')})`).join(', ')
  return sendEmail({
    to,
    subject: `Nouvelle commande ${orderRef(order.order_number)} — ${formatPrice(order.total_mad, 'fr')}`,
    html: `<p><strong>${escapeHtml(order.full_name)}</strong> — ${escapeHtml(order.phone)} — ${escapeHtml(order.city)}</p>
<p>${escapeHtml(order.address)}</p><p>${escapeHtml(items)}</p>
<p>Paiement : ${order.payment_method} — Total : ${formatPrice(order.total_mad, 'fr')}</p>
${SITE_URL ? `<p><a href="${SITE_URL}/admin/commandes/${order.id}">Ouvrir la commande</a></p>` : ''}`,
  })
}

async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: EMAIL_FROM, to, subject, html }),
    signal: AbortSignal.timeout(10000),
  })
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`)
}

// Asks the customer to confirm with the template's "Oui" / "Non" buttons;
// their answer comes back through /api/whatsapp/webhook.
async function askConfirmation(order: OrderRow, supabase: ReturnType<typeof createServiceClient>) {
  await sendConfirmationTemplate({
    phone: order.phone,
    locale: order.locale,
    orderId: order.id,
    variables: [order.full_name.split(' ')[0], orderRef(order.order_number), formatPrice(order.total_mad, order.locale)],
  })
  await supabase
    .from('orders')
    .update({ whatsapp_confirmation: 'sent', whatsapp_sent_at: new Date().toISOString() })
    .eq('id', order.id)
    .eq('whatsapp_confirmation', 'none')
}

async function sendSms(order: OrderRow) {
  const body =
    order.locale === 'ar'
      ? `Royeel: شكراً ${order.full_name.split(' ')[0]}، تم تسجيل طلبك ${orderRef(order.order_number)} (${formatPrice(order.total_mad, 'ar')}). سنتصل بك للتأكيد.`
      : `Royeel : merci ${order.full_name.split(' ')[0]}, votre commande ${orderRef(order.order_number)} (${formatPrice(order.total_mad, 'fr')}) est enregistrée. Nous vous appelons pour confirmer.`
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ To: order.phone, From: TWILIO_FROM, Body: body }),
    signal: AbortSignal.timeout(10000),
  })
  if (!res.ok) throw new Error(`Twilio ${res.status}: ${await res.text()}`)
}

export function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
}
