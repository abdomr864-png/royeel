import { getAdmin } from '@/lib/admin/auth'
import { csvResponse, toCsv } from '@/lib/admin/csv'
import { SOURCE_LABEL } from '@/lib/admin/labels'
import { displayPhone, formatDateTime } from '@/lib/format'
import type { OrderSource } from '@/lib/types'

type Row = {
  full_name: string
  phone: string
  email: string | null
  city: string
  address: string
  first_source: OrderSource | null
  orders_count: number
  total_spent_mad: number
  created_at: string
  last_order_at: string | null
}

export async function GET(request: Request) {
  const admin = await getAdmin()
  if (!admin?.isAdmin) return new Response('Non autorisé', { status: 401 })
  const q = (new URL(request.url).searchParams.get('q') ?? '').trim().slice(0, 80)

  let query = admin.supabase.from('customer_overview').select('*').order('last_order_at', { ascending: false, nullsFirst: false }).limit(10000)
  if (q) {
    const digits = q.replace(/\D/g, '')
    const text = q.replace(/[,()*%\\]/g, ' ').trim()
    query = digits.length >= 6 ? query.ilike('phone', `%${digits.replace(/^0/, '')}%`) : query.or(`full_name.ilike.%${text}%,city.ilike.%${text}%,email.ilike.%${text}%`)
  }
  const { data, error } = await query
  if (error) return new Response('Erreur', { status: 500 })

  const rows = (data ?? []) as Row[]
  const csv = toCsv(
    ['Nom', 'Téléphone', 'E-mail', 'Ville', 'Adresse', 'Source', 'Commandes', 'Total dépensé (DH)', 'Cliente depuis', 'Dernière commande'],
    rows.map((c) => [
      c.full_name,
      displayPhone(c.phone),
      c.email,
      c.city,
      c.address,
      c.first_source ? SOURCE_LABEL[c.first_source] : '',
      c.orders_count,
      c.total_spent_mad,
      formatDateTime(c.created_at),
      c.last_order_at ? formatDateTime(c.last_order_at) : '',
    ]),
  )
  return csvResponse(csv, `royeel-clients-${new Date().toISOString().slice(0, 10)}.csv`)
}
