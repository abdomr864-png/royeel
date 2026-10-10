import Link from 'next/link'
import { btn, Empty, input, PageHeader } from '@/components/admin/ui'
import { requireAdmin } from '@/lib/admin/auth'
import { SOURCE_LABEL } from '@/lib/admin/labels'
import { displayPhone, formatDateTime, formatPrice, whatsappLink } from '@/lib/format'
import type { OrderSource } from '@/lib/types'

export const metadata = { title: 'Clients' }

// Checks the session on the server first, so navigating here waits for it.
export const instant = false

type Customer = {
  id: string
  full_name: string
  phone: string
  email: string | null
  city: string
  first_source: OrderSource | null
  orders_count: number
  total_spent_mad: number
  last_order_at: string | null
}

export default async function CustomersPage({ searchParams }: PageProps<'/admin/clients'>) {
  const { supabase } = await requireAdmin()
  const sp = await searchParams
  const q = typeof sp.q === 'string' ? sp.q.trim().slice(0, 80) : ''

  let query = supabase.from('customer_overview').select('*', { count: 'exact' }).order('last_order_at', { ascending: false, nullsFirst: false }).limit(200)
  if (q) {
    const digits = q.replace(/\D/g, '')
    const text = q.replace(/[,()*%\\]/g, ' ').trim()
    query = digits.length >= 6 ? query.ilike('phone', `%${digits.replace(/^0/, '')}%`) : query.or(`full_name.ilike.%${text}%,city.ilike.%${text}%,email.ilike.%${text}%`)
  }
  const { data, count, error } = await query
  if (error) throw new Error(error.message)
  const customers = (data ?? []) as Customer[]

  return (
    <>
      <PageHeader
        title="Clients"
        subtitle={`${count ?? 0} cliente${(count ?? 0) > 1 ? 's' : ''}`}
        actions={
          <a href={`/admin/export/clients${q ? `?q=${encodeURIComponent(q)}` : ''}`} className={btn.secondary}>
            Exporter (Excel)
          </a>
        }
      />
      <form action="/admin/clients" className="mb-6 flex gap-2">
        <input name="q" defaultValue={q} placeholder="Nom, téléphone, ville ou e-mail" className={`${input} mt-0 max-w-md`} aria-label="Rechercher" />
        <button type="submit" className={btn.primary}>
          Rechercher
        </button>
        {q ? (
          <Link href="/admin/clients" className={btn.ghost}>
            Effacer
          </Link>
        ) : null}
      </form>

      {customers.length === 0 ? (
        <Empty>Les clientes apparaîtront ici après leur première commande.</Empty>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-line/70 bg-white">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-[#faf7f2] text-xs uppercase tracking-wide text-mute">
              <tr>
                <th className="px-4 py-3 text-start font-medium">Cliente</th>
                <th className="px-4 py-3 text-start font-medium">Ville</th>
                <th className="px-4 py-3 text-start font-medium">Source</th>
                <th className="px-4 py-3 text-end font-medium">Commandes</th>
                <th className="px-4 py-3 text-end font-medium">Total dépensé</th>
                <th className="px-4 py-3 text-start font-medium">Dernière commande</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line/60">
              {customers.map((c) => (
                <tr key={c.id} className="hover:bg-[#fcfaf7]">
                  <td className="px-4 py-3">
                    <Link href={`/admin/commandes?q=${encodeURIComponent(c.phone.replace('+212', '0'))}`} className="text-ink hover:text-burgundy">
                      {c.full_name}
                    </Link>
                    <span className="block text-xs text-mute">
                      {displayPhone(c.phone)}
                      {c.email ? ` · ${c.email}` : ''}
                    </span>
                  </td>
                  <td className="px-4 py-3">{c.city}</td>
                  <td className="px-4 py-3 text-mute">{c.first_source ? SOURCE_LABEL[c.first_source] : '—'}</td>
                  <td className="px-4 py-3 text-end tabular-nums">{c.orders_count}</td>
                  <td className="px-4 py-3 text-end tabular-nums">{formatPrice(c.total_spent_mad, 'fr')}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-mute">{c.last_order_at ? formatDateTime(c.last_order_at) : '—'}</td>
                  <td className="px-4 py-3 text-end">
                    <a href={whatsappLink(c.phone)} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-[#1f7a4d] hover:underline">
                      WhatsApp
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
