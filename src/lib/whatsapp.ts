import 'server-only'

// WhatsApp Business Cloud API (Meta): the confirmation message sent to each
// new order, and the short replies to the customer's answer.

const TOKEN = process.env.WHATSAPP_TOKEN ?? ''
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID ?? ''
const API_VERSION = process.env.WHATSAPP_API_VERSION ?? 'v23.0'
export const WHATSAPP_TEMPLATE = process.env.WHATSAPP_TEMPLATE ?? 'order_confirmation'
// Set in the Meta app; used to check that webhook calls come from Meta.
export const WHATSAPP_APP_SECRET = process.env.WHATSAPP_APP_SECRET ?? ''
// Any long random text, typed both here and in the Meta webhook settings.
export const WHATSAPP_VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN ?? ''

export const whatsappConfigured = Boolean(TOKEN && PHONE_NUMBER_ID)

// Payload of the template's quick-reply buttons: "yes:<order id>", "no:<order id>".
export type Answer = 'yes' | 'no'
export function buttonPayload(answer: Answer, orderId: string) {
  return `${answer}:${orderId}`
}

async function send(body: object): Promise<{ messages?: { id: string }[] }> {
  const res = await fetch(`https://graph.facebook.com/${API_VERSION}/${PHONE_NUMBER_ID}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', ...body }),
    signal: AbortSignal.timeout(10000),
  })
  if (!res.ok) throw new Error(`WhatsApp ${res.status}: ${await res.text()}`)
  return res.json()
}

// The approved template: three body variables ({{1}} first name, {{2}} order
// reference, {{3}} total) and two quick-reply buttons, "Oui" then "Non".
export function sendConfirmationTemplate({
  phone,
  locale,
  orderId,
  variables,
}: {
  phone: string
  locale: string
  orderId: string
  variables: [string, string, string]
}) {
  return send({
    to: phone.replace(/\D/g, ''),
    type: 'template',
    template: {
      name: WHATSAPP_TEMPLATE,
      language: { code: locale },
      components: [
        { type: 'body', parameters: variables.map((text) => ({ type: 'text', text })) },
        ...(['yes', 'no'] as const).map((answer, index) => ({
          type: 'button',
          sub_type: 'quick_reply',
          index: String(index),
          parameters: [{ type: 'payload', payload: buttonPayload(answer, orderId) }],
        })),
      ],
    },
  })
}

// Free text, allowed within 24 hours of the customer's last message.
export function sendText(phone: string, text: string) {
  return send({ to: phone.replace(/\D/g, ''), type: 'text', text: { body: text, preview_url: false } })
}
