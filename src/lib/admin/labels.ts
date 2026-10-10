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
