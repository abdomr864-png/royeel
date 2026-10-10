import Link from 'next/link'
import { connection } from 'next/server'
import { BarList, ColumnChart, type ColumnPoint } from '@/components/admin/charts'
import { Card, Empty, PageHeader, StatusPill } from '@/components/admin/ui'
import { requireAdmin } from '@/lib/admin/auth'
import { SOURCE_LABEL } from '@/lib/admin/labels'
import { formatDateTime, formatPrice, orderRef } from '@/lib/format'
import { ORDER_STATUSES, type OrderSource, type OrderStatus } from '@/lib/types'

export const metadata = { title: 'Tableau de bord' }

// Checks the session on the server first, so navigating here waits for it.
export const instant = false

const PERIODS = [
  { key: '7', label: '7 jours', days: 7 },
  { key: '30', label: '30 jours', days: 30 },
  { key: '90', label: '90 jours', days: 90 },
  { key: '365', label: '12 mois', days: 365 },
] as const

type Dashboard = {
  orders: number
  live_orders: number
  revenue_mad: number
  delivered_revenue_mad: number
  items_sold: number
  by_status: Partial<Record<OrderStatus, number>>
  by_source: { source: OrderSource | 'unknown'; orders: number; revenue_mad: number }[]
  by_size: { size: string; quantity: number }[]
  by_city: { city: string; orders: number }[]
  daily: { day: string; orders: number; revenue_mad: number }[]
}

export default async function DashboardPage({ searchParams }: PageProps<'/admin'>) {
  const { supabase } = await requireAdmin()
  await connection()
  const sp = await searchParams
  const period = PERIODS.find((p) => p.key === sp.p) ?? PERIODS[1]

  const { from, to } = periodRange(period.days)

  const [{ data, error }, { data: recent }, { count: toProcess }] = await Promise.all([
    supabase.rpc('admin_dashboard', { p_from: from.toISOString(), p_to: to.toISOString() }),
    supabase
      .from('orders')
      .select('id, order_number, full_name, city, total_mad, status, created_at')
      .order('created_at', { ascending: false })
      .limit(6),
    supabase.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'new'),
  ])
  if (error) throw new Error(error.message)
  const d = data as Dashboard

  const avg = d.live_orders ? Math.round(d.revenue_mad / d.live_orders) : 0
  const points = buildSeries(d.daily, from, to, period.days)
  const sourceTotal = d.by_source.reduce((n, s) => n + s.orders, 0)

  return (
    <>
      <PageHeader title="Tableau de bord" subtitle="Les commandes annulées ne comptent pas dans le chiffre d’affaires." />

      <nav aria-label="Période" className="mb-6 flex flex-wrap gap-2">
        {PERIODS.map((p) => (
          <Link
            key={p.key}
            href={`/admin?p=${p.key}`}
            className={`rounded-full px-4 py-1.5 text-sm transition-colors ${
              p.key === period.key ? 'bg-burgundy text-ivory' : 'border border-line bg-white text-ink hover:border-burgundy/40'
            }`}
          >
            {p.label}
          </Link>
        ))}
      </nav>

      {toProcess ? (
        <Link
          href="/admin/commandes?statut=new"
          className="mb-6 flex items-center justify-between gap-4 rounded-2xl bg-amber-50 px-5 py-4 text-amber-950 ring-1 ring-amber-200 transition-colors hover:bg-amber-100"
        >
          <span>
            <strong className="font-semibold">{toProcess}</strong> {toProcess > 1 ? 'nouvelles commandes à confirmer' : 'nouvelle commande à confirmer'}
          </span>
          <span aria-hidden>→</span>
        </Link>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Chiffre d’affaires" value={formatPrice(d.revenue_mad, 'fr')} hero sub={`dont livré : ${formatPrice(d.delivered_revenue_mad, 'fr')}`} />
        <Stat label="Commandes" value={String(d.live_orders)} sub={d.orders !== d.live_orders ? `${d.orders - d.live_orders} annulée(s) en plus` : undefined} />
        <Stat label="Panier moyen" value={formatPrice(avg, 'fr')} />
        <Stat label="Pièces vendues" value={String(d.items_sold)} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <Card title={period.days > 90 ? 'Chiffre d’affaires par mois' : 'Chiffre d’affaires par jour'}>
          {d.live_orders ? (
            <>
              <ColumnChart points={points} unit="DH" ariaLabel="Chiffre d’affaires dans le temps" />
              <details className="mt-4 text-sm">
                <summary className="cursor-pointer text-mute hover:text-ink">Voir le tableau</summary>
                <table className="mt-3 w-full text-start tabular-nums">
                  <tbody>
                    {points
                      .filter((p) => p.value > 0)
                      .map((p) => (
                        <tr key={p.label} className="border-t border-line/60">
                          <td className="py-1.5">{p.label}</td>
                          <td className="py-1.5 text-end">{formatPrice(p.value, 'fr')}</td>
                          <td className="py-1.5 text-end text-mute">{p.secondary}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </details>
            </>
          ) : (
            <Empty>Aucune commande sur cette période.</Empty>
          )}
        </Card>

        <Card title="Commandes par statut">
          <ul className="grid gap-2">
            {ORDER_STATUSES.map((s) => (
              <li key={s}>
                <Link href={`/admin/commandes?statut=${s}`} className="flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-ink/[0.03]">
                  <StatusPill status={s} />
                  <span className="tabular-nums text-ink">{d.by_status[s] ?? 0}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card title="Ventes par source">
          <BarList
            empty="Pas encore de ventes."
            unit="cmd"
            items={d.by_source.map((s) => ({
              label: SOURCE_LABEL[s.source] ?? s.source,
              value: s.orders,
              detail: `${Math.round((s.orders / Math.max(sourceTotal, 1)) * 100)} % · ${formatPrice(s.revenue_mad, 'fr')}`,
            }))}
          />
          <p className="mt-4 text-xs text-mute">D’après la réponse « Comment nous avez-vous connus ? » au moment de la commande.</p>
        </Card>
        <Card title="Tailles vendues">
          <BarList empty="Pas encore de ventes." unit="pièce(s)" items={d.by_size.map((s) => ({ label: s.size, value: s.quantity }))} />
        </Card>
        <Card title="Villes">
          <BarList empty="Pas encore de ventes." unit="cmd" items={d.by_city.map((c) => ({ label: c.city, value: c.orders }))} />
        </Card>
      </div>

      <Card title="Dernières commandes" className="mt-4" actions={<Link href="/admin/commandes" className="text-sm text-burgundy hover:underline">Tout voir</Link>}>
        {recent?.length ? (
          <ul className="divide-y divide-line/70">
            {recent.map((o) => (
              <li key={o.id}>
                <Link href={`/admin/commandes/${o.id}`} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-3 hover:bg-ink/[0.02]">
                  <span className="min-w-0">
                    <span className="font-medium text-ink">{orderRef(o.order_number)}</span>
                    <span className="text-mute"> · {o.full_name} · {o.city}</span>
                  </span>
                  <span className="flex items-center gap-3 text-sm">
                    <span className="text-mute">{formatDateTime(o.created_at)}</span>
                    <span className="tabular-nums">{formatPrice(o.total_mad, 'fr')}</span>
                    <StatusPill status={o.status as OrderStatus} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <Empty>Les commandes apparaîtront ici dès la première vente.</Empty>
        )}
      </Card>
    </>
  )
}

function periodRange(days: number) {
  const to = new Date(Date.now() + 60_000)
  return { from: new Date(to.getTime() - days * 86_400_000), to }
}

function Stat({ label, value, sub, hero }: { label: string; value: string; sub?: string; hero?: boolean }) {
  return (
    <div className="rounded-2xl border border-line/70 bg-white p-5">
      <p className="text-sm text-mute">{label}</p>
      <p className={`mt-2 font-sans font-semibold text-ink ${hero ? 'text-3xl md:text-4xl' : 'text-2xl md:text-3xl'}`}>{value}</p>
      {sub ? <p className="mt-1 text-xs text-mute">{sub}</p> : null}
    </div>
  )
}

const dayFmt = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', timeZone: 'Africa/Casablanca' })
const longDayFmt = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Africa/Casablanca' })
const monthFmt = new Intl.DateTimeFormat('fr-FR', { month: 'short', year: '2-digit', timeZone: 'Africa/Casablanca' })
const longMonthFmt = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric', timeZone: 'Africa/Casablanca' })

// Fills days without sales with zero (or groups by month for long periods).
function buildSeries(daily: Dashboard['daily'], from: Date, to: Date, days: number): ColumnPoint[] {
  const byDay = new Map(daily.map((d) => [d.day, d]))
  if (days <= 90) {
    const out: ColumnPoint[] = []
    for (let t = from.getTime() + 86_400_000; t <= to.getTime(); t += 86_400_000) {
      const date = new Date(t)
      const key = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Casablanca' }).format(date)
      const row = byDay.get(key)
      out.push({
        label: longDayFmt.format(date),
        short: dayFmt.format(date),
        value: row?.revenue_mad ?? 0,
        secondary: row ? `${row.orders} commande(s)` : '0 commande',
      })
    }
    return out
  }
  const months = new Map<string, { date: Date; revenue: number; orders: number }>()
  for (let t = from.getTime(); t <= to.getTime(); t += 86_400_000 * 28) {
    const date = new Date(t)
    const key = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Casablanca', year: 'numeric', month: '2-digit' }).format(date)
    if (!months.has(key)) months.set(key, { date, revenue: 0, orders: 0 })
  }
  for (const d of daily) {
    const key = d.day.slice(0, 7)
    const m = months.get(key) ?? { date: new Date(`${d.day}T12:00:00Z`), revenue: 0, orders: 0 }
    m.revenue += d.revenue_mad
    m.orders += d.orders
    months.set(key, m)
  }
  return [...months.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, m]) => ({ label: longMonthFmt.format(m.date), short: monthFmt.format(m.date), value: m.revenue, secondary: `${m.orders} commande(s)` }))
}
