import { getAdmin } from '@/lib/admin/auth'
import { csvResponse, toCsv } from '@/lib/admin/csv'
import { PAYMENT_METHOD_LABEL, PAYMENT_STATUS_LABEL, SOURCE_LABEL, STATUS_LABEL } from '@/lib/admin/labels'
import { ordersQuery, parseOrderFilters } from '@/lib/admin/orders-query'
import { displayPhone, formatDateTime, orderRef } from '@/lib/format'
import type { OrderSource, OrderStatus, PaymentMethod, PaymentStatus } from '@/lib/types'

type Row = {
  order_number: number
  created_at: string
  status: OrderStatus
  full_name: string
  phone: string
  city: string
  address: string
  email: string | null
  payment_method: PaymentMethod
  payment_status: PaymentStatus
  total_mad: number
  source: OrderSource | null
  admin_note: string
  order_items: { product_name: string; size_label: string; color_name: string; quantity: number }[]
}

// Orders as a spreadsheet (same filters as the orders page), e.g. to send to
// the delivery company.
export async function GET(request: Request) {
  const admin = await getAdmin()
  if (!admin?.isAdmin) return new Response('Non autorisé', { status: 401 })
  const url = new URL(request.url)
  const filters = parseOrderFilters(Object.fromEntries(url.searchParams))
  const { data, error } = await ordersQuery(
    admin.supabase,
    filters,
    'order_number, created_at, status, full_name, phone, city, address, email, payment_method, payment_status, total_mad, source, admin_note, order_items(product_name, size_label, color_name, quantity)',
  ).limit(5000)
  if (error) return new Response('Erreur', { status: 500 })

  const rows = (data ?? []) as unknown as Row[]
  const csv = toCsv(
    ['N°', 'Date', 'Statut', 'Nom', 'Téléphone', 'Ville', 'Adresse', 'Articles', 'Total (DH)', 'Paiement', 'Payée', 'E-mail', 'Source', 'Note'],
    rows.map((o) => [
      orderRef(o.order_number),
      formatDateTime(o.created_at),
      STATUS_LABEL[o.status],
      o.full_name,
      displayPhone(o.phone),
      o.city,
      o.address,
      o.order_items.map((i) => `${i.quantity} × ${i.product_name} (${[i.color_name, i.size_label].filter(Boolean).join(', ')})`).join(' + '),
      o.total_mad,
      PAYMENT_METHOD_LABEL[o.payment_method],
      PAYMENT_STATUS_LABEL[o.payment_status],
      o.email,
      o.source ? SOURCE_LABEL[o.source] : '',
      o.admin_note,
    ]),
  )
  const stamp = new Date().toISOString().slice(0, 10)
  return csvResponse(csv, `royeel-commandes-${filters.status ?? 'toutes'}-${stamp}.csv`)
}
