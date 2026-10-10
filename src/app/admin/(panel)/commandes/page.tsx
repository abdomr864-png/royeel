import Link from 'next/link'
import { OrderStatusSelect } from '@/components/admin/OrderControls'
import { btn, Empty, input, PageHeader, StatusPill } from '@/components/admin/ui'
import { requireAdmin } from '@/lib/admin/auth'
import { PAYMENT_METHOD_LABEL, PAYMENT_STATUS_LABEL, STATUS_LABEL } from '@/lib/admin/labels'
import { PAGE_SIZE, ordersQuery, parseOrderFilters } from '@/lib/admin/orders-query'
import { displayPhone, formatDateTime, formatPrice, orderRef } from '@/lib/format'
import { ORDER_STATUSES, type OrderStatus, type PaymentMethod, type PaymentStatus } from '@/lib/types'

export const metadata = { title: 'Commandes' }

// Checks the session on the server first, so navigating here waits for it.
export const instant = false

type Row = {
  id: string
  order_number: number
  created_at: string
  full_name: string
  phone: string
  city: string
  status: OrderStatus
  payment_method: PaymentMethod
  payment_status: PaymentStatus
  total_mad: number
  order_items: { size_label: string; color_name: string; quantity: number }[]
}

export default async function OrdersPage({ searchParams }: PageProps<'/admin/commandes'>) {
  const { supabase } = await requireAdmin()
  const filters = parseOrderFilters(await searchParams)
  const offset = (filters.page - 1) * PAGE_SIZE

  const [{ data, count, error }, ...statusCounts] = await Promise.all([
    ordersQuery(
      supabase,
      filters,
      'id, order_number, created_at, full_name, phone, city, status, payment_method, payment_status, total_mad, order_items(size_label, color_name, quantity)',
    ).range(offset, offset + PAGE_SIZE - 1),
    ...ORDER_STATUSES.map((s) => supabase.from('orders').select('id', { count: 'exact', head: true }).eq('status', s)),
  ])
  if (error) throw new Error(error.message)
  const rows = (data ?? []) as unknown as Row[]
  const total = count ?? 0
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const byStatus = new Map<string, number>(ORDER_STATUSES.map((s, i) => [s, statusCounts[i].count ?? 0]))
  const allCount = [...byStatus.values()].reduce((a, b) => a + b, 0)

  const qs = (extra: Record<string, string | number | null>) => {
    const p = new URLSearchParams()
    const merged = { statut: filters.status, q: filters.q || null, page: null as number | null, ...extra }
    for (const [k, v] of Object.entries(merged)) if (v !== null && v !== '' && v !== undefined) p.set(k, String(v))
    const s = p.toString()
    return s ? `?${s}` : ''
  }

  return (
    <>
      <PageHeader
        title="Commandes"
        subtitle={`${total} commande${total > 1 ? 's' : ''}${filters.status ? ` · ${STATUS_LABEL[filters.status]}` : ''}`}
        actions={
          <a href={`/admin/export/commandes${qs({})}`} className={btn.secondary}>
            Exporter (Excel)
          </a>
        }
      />

      <nav aria-label="Statut" className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0">
        <Tab href={`/admin/commandes${qs({ statut: null })}`} active={!filters.status} label="Toutes" count={allCount} />
        {ORDER_STATUSES.map((s) => (
          <Tab key={s} href={`/admin/commandes${qs({ statut: s })}`} active={filters.status === s} label={STATUS_LABEL[s]} count={byStatus.get(s) ?? 0} />
        ))}
      </nav>

      <form action="/admin/commandes" className="mb-6 flex gap-2">
        {filters.status ? <input type="hidden" name="statut" value={filters.status} /> : null}
        <input
          name="q"
          defaultValue={filters.q}
          placeholder="Nom, téléphone, ville ou n° (RY-1001)"
          className={`${input} mt-0 max-w-md`}
          aria-label="Rechercher"
        />
        <button type="submit" className={btn.primary}>
          Rechercher
        </button>
        {filters.q ? (
          <Link href={`/admin/commandes${qs({ q: null })}`} className={btn.ghost}>
            Effacer
          </Link>
        ) : null}
      </form>

      {rows.length === 0 ? (
        <Empty>Aucune commande ici pour le moment.</Empty>
      ) : (
        <>
          {/* Phone: cards */}
          <ul className="grid gap-3 md:hidden">
            {rows.map((o) => (
              <li key={o.id} className="rounded-2xl border border-line/70 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <Link href={`/admin/commandes/${o.id}`} className="min-w-0">
                    <p className="font-medium text-ink">
                      {orderRef(o.order_number)} · {o.full_name}
                    </p>
                    <p className="text-sm text-mute">
                      {o.city} · {displayPhone(o.phone)}
                    </p>
                  </Link>
                  <StatusPill status={o.status} />
                </div>
                <p className="mt-2 text-sm text-ink">
                  {sizes(o)} · <span className="tabular-nums">{formatPrice(o.total_mad, 'fr')}</span> · {PAYMENT_METHOD_LABEL[o.payment_method]}
                </p>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <span className="text-xs text-mute">{formatDateTime(o.created_at)}</span>
                  <OrderStatusSelect orderId={o.id} status={o.status} compact />
                </div>
              </li>
            ))}
          </ul>

          {/* Desktop: table */}
          <div className="hidden overflow-x-auto rounded-2xl border border-line/70 bg-white md:block">
            <table className="w-full text-sm">
              <thead className="bg-[#faf7f2] text-start text-xs uppercase tracking-wide text-mute">
                <tr>
                  <th className="px-4 py-3 text-start font-medium">N°</th>
                  <th className="px-4 py-3 text-start font-medium">Date</th>
                  <th className="px-4 py-3 text-start font-medium">Cliente</th>
                  <th className="px-4 py-3 text-start font-medium">Taille</th>
                  <th className="px-4 py-3 text-end font-medium">Total</th>
                  <th className="px-4 py-3 text-start font-medium">Paiement</th>
                  <th className="px-4 py-3 text-start font-medium">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/60">
                {rows.map((o) => (
                  <tr key={o.id} className="hover:bg-[#fcfaf7]">
                    <td className="px-4 py-3 font-medium">
                      <Link href={`/admin/commandes/${o.id}`} className="text-burgundy hover:underline">
                        {orderRef(o.order_number)}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-mute">{formatDateTime(o.created_at)}</td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/commandes/${o.id}`} className="block">
                        <span className="text-ink">{o.full_name}</span>
                        <span className="block text-xs text-mute">
                          {displayPhone(o.phone)} · {o.city}
                        </span>
                      </Link>
                    </td>
                    <td className="px-4 py-3">{sizes(o)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-end tabular-nums">{formatPrice(o.total_mad, 'fr')}</td>
                    <td className="px-4 py-3">
                      <span className="block">{PAYMENT_METHOD_LABEL[o.payment_method]}</span>
                      <span className={`text-xs ${o.payment_status === 'paid' ? 'text-emerald-700' : 'text-mute'}`}>{PAYMENT_STATUS_LABEL[o.payment_status]}</span>
                    </td>
                    <td className="px-4 py-3">
                      <OrderStatusSelect orderId={o.id} status={o.status} compact />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pages > 1 ? (
            <div className="mt-6 flex items-center justify-center gap-3 text-sm">
              {filters.page > 1 ? (
                <Link href={`/admin/commandes${qs({ page: filters.page - 1 })}`} className={btn.secondary}>
                  ← Précédent
                </Link>
              ) : null}
              <span className="text-mute">
                Page {filters.page} / {pages}
              </span>
              {filters.page < pages ? (
                <Link href={`/admin/commandes${qs({ page: filters.page + 1 })}`} className={btn.secondary}>
                  Suivant →
                </Link>
              ) : null}
            </div>
          ) : null}
        </>
      )}
    </>
  )
}

function sizes(o: Row) {
  return o.order_items.map((i) => `${i.color_name ? `${i.color_name} ` : ''}${i.size_label}${i.quantity > 1 ? ` ×${i.quantity}` : ''}`).join(', ') || '—'
}

function Tab({ href, active, label, count }: { href: string; active: boolean; label: string; count: number }) {
  return (
    <Link
      href={href}
      className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-1.5 text-sm transition-colors ${
        active ? 'bg-burgundy text-ivory' : 'border border-line bg-white text-ink hover:border-burgundy/40'
      }`}
    >
      {label}
      <span className={`tabular-nums ${active ? 'text-ivory/70' : 'text-mute'}`}>{count}</span>
    </Link>
  )
}
