import { getAdmin } from '@/lib/admin/auth'
import { toXlsx, xlsxResponse } from '@/lib/admin/xlsx'
import { matchCity, orderRef } from '@/lib/format'
import { ORDER_STATUSES, type OrderStatus, type PaymentMethod, type PaymentStatus } from '@/lib/types'

type Row = {
  order_number: number
  full_name: string
  phone: string
  city: string
  address: string
  payment_method: PaymentMethod
  payment_status: PaymentStatus
  total_mad: number
  allow_open: boolean | null
  allow_try: boolean | null
  is_exchange: boolean
  delivery_note: string
  order_items: { product_name: string; size_label: string; color_name: string; quantity: number }[]
}

// The columns of Ozon Express's import file, in its order.
const HEADER = [
  'Nom',
  'Telephone',
  'Adresse',
  'Montant',
  'Ville',
  'Ville de ramassage',
  'note (optionnel)',
  "Autoriser l'ouverture",
  'Produit de stock',
  'Produits',
  'Emballage si les produits de stock',
  "Autoriser l'essayage",
  'Référence vendeur (optionnel)',
]

// Orders ready to ship (confirmed by default) as Ozon Express's Excel file,
// to upload on the Ozon Express space.
export async function GET(request: Request) {
  const admin = await getAdmin()
  if (!admin?.isAdmin) return new Response('Non autorisé', { status: 401 })
  const param = new URL(request.url).searchParams.get('statut')
  const status: OrderStatus = ORDER_STATUSES.includes(param as OrderStatus) ? (param as OrderStatus) : 'confirmed'

  const [{ data, error }, { data: settings }] = await Promise.all([
    admin.supabase
      .from('orders')
      .select(
        'order_number, full_name, phone, city, address, payment_method, payment_status, total_mad, allow_open, allow_try, is_exchange, delivery_note, order_items(product_name, size_label, color_name, quantity)',
      )
      .eq('status', status)
      .order('created_at', { ascending: true })
      .limit(5000),
    admin.supabase.from('store_settings').select('ozon_pickup_city, ozon_allow_open, ozon_allow_try').single(),
  ])
  if (error) return new Response('Erreur', { status: 500 })

  const yes = (v: boolean) => (v ? 'Oui' : 'Non')
  const rows = ((data ?? []) as unknown as Row[]).map((o) => {
    const items = o.order_items
      .map((i) => `${i.product_name}${i.color_name ? ` ${i.color_name}` : ''} T.${i.size_label}${i.quantity > 1 ? ` x${i.quantity}` : ''}`)
      .join(' + ')
    const note = [o.is_exchange ? "COLIS D'ÉCHANGE : reprendre l'ancien article" : '', items, o.delivery_note].filter(Boolean).join(' · ')
    // Already paid by card or transfer: nothing to collect.
    const collect = o.payment_method === 'cod' && o.payment_status !== 'paid' ? o.total_mad : 0
    return [
      o.full_name,
      o.phone.replace(/^\+212/, '0'),
      o.address,
      collect,
      matchCity(o.city) ?? o.city,
      settings?.ozon_pickup_city ?? '',
      note,
      yes(o.allow_open ?? settings?.ozon_allow_open ?? true),
      'Non',
      '',
      '',
      yes(o.allow_try ?? settings?.ozon_allow_try ?? true),
      orderRef(o.order_number),
    ]
  })

  const stamp = new Date().toISOString().slice(0, 10)
  return xlsxResponse(toXlsx('Commandes', HEADER, rows), `ozon-express-royeel-${stamp}.xlsx`)
}
