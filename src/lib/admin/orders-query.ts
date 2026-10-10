import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { ORDER_STATUSES, type OrderStatus } from '@/lib/types'

export const PAGE_SIZE = 40

export type OrderFilters = { status: OrderStatus | null; q: string; page: number }

export function parseOrderFilters(sp: Record<string, string | string[] | undefined>): OrderFilters {
  const status = typeof sp.statut === 'string' && ORDER_STATUSES.includes(sp.statut as OrderStatus) ? (sp.statut as OrderStatus) : null
  const q = typeof sp.q === 'string' ? sp.q.trim().slice(0, 80) : ''
  const page = Math.max(1, Number(sp.page) || 1)
  return { status, q, page }
}

// Shared by the orders page and the CSV export so both show the same rows.
export function ordersQuery(supabase: SupabaseClient, f: OrderFilters, select: string) {
  let query = supabase.from('orders').select(select, { count: 'exact' }).order('created_at', { ascending: false })
  if (f.status) query = query.eq('status', f.status)
  if (f.q) {
    const ref = f.q.match(/^(?:ry-?)?(\d{1,7})$/i)
    const digits = f.q.replace(/\D/g, '')
    // Strip characters that have a meaning in PostgREST filters.
    const text = f.q.replace(/[,()*%\\]/g, ' ').trim()
    if (ref) {
      query = query.or(`order_number.eq.${Number(ref[1])},phone.ilike.%${ref[1]}%`)
    } else if (digits.length >= 6) {
      query = query.ilike('phone', `%${digits.replace(/^0/, '')}%`)
    } else if (text) {
      query = query.or(`full_name.ilike.%${text}%,city.ilike.%${text}%,email.ilike.%${text}%`)
    }
  }
  return query
}
