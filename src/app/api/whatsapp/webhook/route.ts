import { createHmac, timingSafeEqual } from 'node:crypto'
import { revalidateTag } from 'next/cache'
import { STORE_TAG } from '@/lib/catalog'
import { displayPhone, normalizeMoroccanPhone, orderRef } from '@/lib/format'
import { dictionaryFor } from '@/lib/i18n/dictionaries'
import type { Locale } from '@/lib/i18n/config'
import { createServiceClient, isServiceConfigured } from '@/lib/supabase/service'
import { sendText, WHATSAPP_APP_SECRET, WHATSAPP_VERIFY_TOKEN, type Answer } from '@/lib/whatsapp'

// Meta checks the webhook address once, when it is saved in the app settings.
export function GET(request: Request) {
  const url = new URL(request.url)
  const ok =
    WHATSAPP_VERIFY_TOKEN &&
    url.searchParams.get('hub.mode') === 'subscribe' &&
    url.searchParams.get('hub.verify_token') === WHATSAPP_VERIFY_TOKEN
  return ok ? new Response(url.searchParams.get('hub.challenge') ?? '') : new Response('Forbidden', { status: 403 })
}

type Message = {
  from: string
  type: string
  text?: { body: string }
  button?: { payload: string; text: string }
  interactive?: { button_reply?: { id: string } }
}

type Payload = { entry?: { changes?: { value?: { messages?: Message[] } }[] }[] }

// Messages the customers send to the shop's WhatsApp number: the "Oui" / "Non"
// buttons of the confirmation message, or the same answer typed.
export async function POST(request: Request) {
  const raw = await request.text()
  if (!validSignature(raw, request.headers.get('x-hub-signature-256'))) return new Response('Forbidden', { status: 403 })
  if (!isServiceConfigured) return new Response('OK')

  const payload = JSON.parse(raw) as Payload
  const messages = payload.entry?.flatMap((e) => e.changes?.flatMap((c) => c.value?.messages ?? []) ?? []) ?? []
  for (const message of messages) {
    try {
      await handle(message)
    } catch (error) {
      // Answer 200 anyway: Meta would otherwise resend the same message for days.
      console.error('whatsapp webhook failed', error)
    }
  }
  return new Response('OK')
}

function validSignature(raw: string, header: string | null) {
  if (!WHATSAPP_APP_SECRET || !header?.startsWith('sha256=')) return false
  const expected = createHmac('sha256', WHATSAPP_APP_SECRET).update(raw, 'utf8').digest()
  const given = Buffer.from(header.slice('sha256='.length), 'hex')
  return given.length === expected.length && timingSafeEqual(given, expected)
}

async function handle(message: Message) {
  const phone = normalizeMoroccanPhone(message.from) ?? `+${message.from}`
  const supabase = createServiceClient()

  // Buttons carry the order; a typed answer goes to the latest order awaiting one.
  const button = message.button?.payload ?? message.interactive?.button_reply?.id ?? ''
  const match = /^(yes|no):([0-9a-f-]{36})$/i.exec(button)
  let answer: Answer | null = match ? (match[1].toLowerCase() as Answer) : typedAnswer(message.text?.body ?? message.button?.text ?? '')
  let orderId = match?.[2] ?? null
  if (answer && !orderId) {
    const { data } = await supabase
      .from('orders')
      .select('id')
      .eq('phone', phone)
      .eq('whatsapp_confirmation', 'sent')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    orderId = data?.id ?? null
  }
  if (!orderId) answer = null

  const [{ data: order }, { data: settings }] = await Promise.all([
    orderId
      ? supabase.from('orders').select('order_number, full_name, locale').eq('id', orderId).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from('store_settings').select('whatsapp_number').single(),
  ])
  const locale: Locale = order?.locale === 'ar' ? 'ar' : 'fr'
  const t = dictionaryFor(locale).whatsapp
  const shopPhone = settings?.whatsapp_number ? normalizeMoroccanPhone(settings.whatsapp_number) : null
  const contact = shopPhone ? `\n\n${t.contact(displayPhone(shopPhone))}` : ''

  const result = answer && orderId
    ? ((await supabase.rpc('whatsapp_answer', { p_order_id: orderId, p_phone: phone, p_answer: answer })).data as string | null)
    : null

  if (result === 'confirmed' && order) {
    await sendText(phone, t.confirmed(order.full_name.split(' ')[0], orderRef(order.order_number)) + contact)
  } else if (result === 'declined' && order) {
    // The pieces are back in stock.
    revalidateTag(STORE_TAG, 'max')
    await sendText(phone, t.declined(orderRef(order.order_number)) + contact)
  } else if (contact) {
    // Nobody reads this number: point to the one the shop answers on.
    await sendText(phone, t.contact(displayPhone(shopPhone!)))
  }
}

// Only words that cannot start an unrelated sentence: no "la" (French
// article) or "ah".
const YES = ['oui', 'ouii', 'wi', 'ok', 'okay', 'yes', 'daccord', 'confirme', 'نعم', 'ايه', 'واخا', 'wakha', 'waxa', 'iyeh']
const NO = ['non', 'no', 'nn', 'annuler', 'annule', 'لا']

// "Oui !", "oui je confirme", "نعم" → yes; "Non merci", "لا" → no.
function typedAnswer(text: string): Answer | null {
  const first = text
    .toLowerCase()
    // Accents and Arabic marks off ("إيه" → "ايه"), apostrophes joined ("d'accord").
    .normalize('NFD')
    .replace(/[\p{M}'’]/gu, '')
    .replace(/[^\p{L}\s]/gu, ' ')
    .trim()
    .split(/\s+/)[0]
  if (!first) return null
  if (YES.includes(first)) return 'yes'
  if (NO.includes(first)) return 'no'
  return null
}
