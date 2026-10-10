'use client'

type Fbq = (...args: unknown[]) => void
type Ttq = { track: (event: string, params?: Record<string, unknown>, options?: Record<string, unknown>) => void; page: () => void }

declare global {
  interface Window {
    fbq?: Fbq
    ttq?: Ttq
  }
}

export type StoreEvent = 'ViewContent' | 'AddToCart' | 'InitiateCheckout' | 'AddPaymentInfo' | 'Purchase' | 'Contact'

// TikTok's names for the same funnel steps.
const TIKTOK_EVENT: Record<StoreEvent, string> = {
  ViewContent: 'ViewContent',
  AddToCart: 'AddToCart',
  InitiateCheckout: 'InitiateCheckout',
  AddPaymentInfo: 'AddPaymentInfo',
  Purchase: 'CompletePayment',
  Contact: 'Contact',
}

type EventData = {
  value?: number
  contentId?: string
  contentName?: string
  quantity?: number
  // Shared with the server-side event so Meta/TikTok count the purchase once.
  eventId?: string
}

export function track(event: StoreEvent, data: EventData = {}) {
  const params = {
    currency: 'MAD',
    value: data.value,
    content_type: 'product',
    content_ids: data.contentId ? [data.contentId] : undefined,
    content_name: data.contentName,
    num_items: data.quantity,
  }
  try {
    window.fbq?.('track', event, params, data.eventId ? { eventID: data.eventId } : undefined)
  } catch {}
  try {
    window.ttq?.track(
      TIKTOK_EVENT[event],
      {
        currency: 'MAD',
        value: data.value,
        contents: data.contentId
          ? [{ content_id: data.contentId, content_name: data.contentName, quantity: data.quantity ?? 1 }]
          : undefined,
        content_type: 'product',
      },
      data.eventId ? { event_id: data.eventId } : undefined,
    )
  } catch {}
}

function readCookie(name: string) {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : undefined
}

// Browser ids that let Meta and TikTok match server-side events to the ad click.
export function adCookies() {
  return { fbp: readCookie('_fbp'), fbc: readCookie('_fbc'), ttp: readCookie('_ttp') }
}
