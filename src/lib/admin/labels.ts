import type { OrderSource, OrderStatus, PaymentMethod, PaymentStatus } from '@/lib/types'

export const STATUS_LABEL: Record<OrderStatus, string> = {
  new: 'Nouvelle',
  confirmed: 'Confirmée',
  shipped: 'Expédiée',
  delivered: 'Livrée',
  cancelled: 'Annulée',
  exchanged: 'Échangée',
}

// Pill colours. Each status always shows its label too, never colour alone.
export const STATUS_STYLE: Record<OrderStatus, string> = {
  new: 'bg-amber-100 text-amber-900 ring-amber-300',
  confirmed: 'bg-sky-100 text-sky-900 ring-sky-300',
  shipped: 'bg-indigo-100 text-indigo-900 ring-indigo-300',
  delivered: 'bg-emerald-100 text-emerald-900 ring-emerald-300',
  cancelled: 'bg-stone-200 text-stone-700 ring-stone-300',
  exchanged: 'bg-rose-100 text-rose-900 ring-rose-300',
}

export type WhatsAppConfirmation = 'none' | 'sent' | 'confirmed' | 'declined'

// After this long without an answer to the WhatsApp message, the order is
// flagged "À appeler".
export const CALL_AFTER_MS = 24 * 60 * 60 * 1000

// Messages sent before this moment are overdue.
export function callCutoff() {
  return new Date(Date.now() - CALL_AFTER_MS).toISOString()
}

// Where the WhatsApp confirmation stands, as a badge; null when none was sent.
export function whatsappBadge(o: { whatsapp_confirmation: WhatsAppConfirmation; whatsapp_sent_at: string | null; status: OrderStatus }) {
  switch (o.whatsapp_confirmation) {
    case 'confirmed':
      return { label: 'Confirmée sur WhatsApp', style: 'bg-emerald-50 text-emerald-800 ring-emerald-200' }
    case 'declined':
      return { label: 'Refusée sur WhatsApp', style: 'bg-stone-100 text-stone-700 ring-stone-300' }
    case 'sent': {
      if (o.status !== 'new') return null
      const late = o.whatsapp_sent_at !== null && Date.now() - new Date(o.whatsapp_sent_at).getTime() > CALL_AFTER_MS
      return late
        ? { label: 'À appeler : pas de réponse', style: 'bg-rose-100 text-rose-900 ring-rose-300' }
        : { label: 'WhatsApp envoyé, en attente', style: 'bg-amber-50 text-amber-900 ring-amber-200' }
    }
    default:
      return null
  }
}

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  pending: 'En attente',
  paid: 'Payée',
  failed: 'Échouée',
  refunded: 'Remboursée',
}

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  cod: 'À la livraison',
  bank_transfer: 'Virement',
  card: 'Carte (CMI)',
}

export const SOURCE_LABEL: Record<OrderSource | 'unknown', string> = {
  instagram: 'Instagram',
  tiktok: 'TikTok',
  facebook: 'Facebook',
  friend: 'Un(e) ami(e)',
  other: 'Autre',
  unknown: 'Non précisé',
}
