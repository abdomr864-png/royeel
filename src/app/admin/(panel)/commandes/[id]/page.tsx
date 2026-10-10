import Link from 'next/link'
import { notFound } from 'next/navigation'
import { NoteForm, PaymentStatusSelect, StatusButtons, WhatsAppButtons, type WhatsAppTemplate } from '@/components/admin/OrderControls'
import { Card, PageHeader, StatusPill } from '@/components/admin/ui'
import { requireAdmin } from '@/lib/admin/auth'
import { PAYMENT_METHOD_LABEL, PAYMENT_STATUS_LABEL, SOURCE_LABEL, STATUS_LABEL } from '@/lib/admin/labels'
import { displayPhone, formatDateTime, formatPrice, orderRef, whatsappLink } from '@/lib/format'
import type { Locale } from '@/lib/i18n/config'
import type { OrderSource, OrderStatus, PaymentMethod, PaymentStatus } from '@/lib/types'

export const metadata = { title: 'Commande' }

// Checks the session on the server first, so navigating here waits for it.
export const instant = false

type Order = {
  id: string
  order_number: number
  created_at: string
  status: OrderStatus
  payment_method: PaymentMethod
  payment_status: PaymentStatus
  payment_ref: string | null
  full_name: string
  phone: string
  email: string | null
  city: string
  address: string
  source: OrderSource | null
  attribution: Record<string, string>
  locale: Locale
  subtotal_mad: number
  shipping_mad: number
  total_mad: number
  admin_note: string
  customer_id: string | null
  order_items: { id: string; product_name: string; size_label: string; color_name: string; quantity: number; unit_price_mad: number }[]
  order_events: { id: number; kind: string; message: string; data: Record<string, string>; created_at: string }[]
}

export default async function OrderPage({ params }: PageProps<'/admin/commandes/[id]'>) {
  const { supabase } = await requireAdmin()
  const { id } = await params
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound()

  const { data } = await supabase.from('orders').select('*, order_items(*), order_events(*)').eq('id', id).single()
  if (!data) notFound()
  const o = data as Order
  o.order_events.sort((a, b) => a.created_at.localeCompare(b.created_at))

  const { count: previousOrders } = o.customer_id
    ? await supabase.from('orders').select('id', { count: 'exact', head: true }).eq('customer_id', o.customer_id).neq('id', o.id)
    : { count: 0 }

  const ref = orderRef(o.order_number)
  const items = o.order_items.map((i) => `${i.product_name}${i.color_name ? ` ${i.color_name}` : ''}, ${o.locale === 'ar' ? 'المقاس' : 'taille'} ${i.size_label}${i.quantity > 1 ? ` ×${i.quantity}` : ''}`).join(' + ')
  const first = o.full_name.split(' ')[0]
  const templates: WhatsAppTemplate[] = [
    {
      key: 'confirm',
      label: 'Confirmer la commande',
      href: whatsappLink(
        o.phone,
        o.locale === 'ar'
          ? `مرحباً ${first}، معك Royeel. توصلنا بطلبك ${ref}: ${items}، المبلغ ${formatPrice(o.total_mad, 'ar')}، التوصيل إلى ${o.city}.\nهل يمكنك تأكيد العنوان: ${o.address}؟ شكراً لك.`
          : `Bonjour ${first}, c’est Royeel. Nous avons bien reçu votre commande ${ref} : ${items}, ${formatPrice(o.total_mad, 'fr')}, livraison à ${o.city}.\nPouvez-vous nous confirmer l’adresse : ${o.address} ? Merci !`,
      ),
    },
    {
      key: 'shipped',
      label: 'Prévenir de l’envoi',
      href: whatsappLink(
        o.phone,
        o.locale === 'ar'
          ? `مرحباً ${first}، طلبك ${ref} في الطريق إليك. سيتصل بك عامل التوصيل قريباً.`
          : `Bonjour ${first}, votre commande ${ref} est en route. Le livreur vous appellera très bientôt.`,
      ),
    },
    { key: 'chat', label: 'Écrire', href: whatsappLink(o.phone) },
  ]

  const attribution = Object.entries(o.attribution ?? {}).filter(([k]) => k.startsWith('utm_') || k === 'fbclid' || k === 'ttclid')

  return (
    <>
      <Link href="/admin/commandes" className="mb-3 inline-block text-sm text-mute hover:text-burgundy">
        ← Commandes
      </Link>
      <PageHeader
        title={`Commande ${ref}`}
        subtitle={<>Passée le {formatDateTime(o.created_at)} · site en {o.locale === 'ar' ? 'arabe' : 'français'}</>}
        actions={<StatusPill status={o.status} />}
      />

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="grid gap-4">
          <Card title="Cliente">
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <Info label="Nom" value={o.full_name} />
              <Info label="Téléphone" value={<a href={`tel:${o.phone}`} className="text-burgundy hover:underline">{displayPhone(o.phone)}</a>} />
              <Info label="Ville" value={o.city} />
              <Info label="E-mail" value={o.email ?? '—'} />
              <Info label="Adresse" value={o.address} wide />
              <Info label="Source" value={o.source ? SOURCE_LABEL[o.source] : SOURCE_LABEL.unknown} />
              <Info label="Commandes précédentes" value={String(previousOrders ?? 0)} />
            </dl>
            <div className="mt-5">
              <WhatsAppButtons orderId={o.id} templates={templates} phoneHref={`tel:${o.phone}`} />
            </div>
          </Card>

          <Card title="Articles">
            <ul className="divide-y divide-line/60 text-sm">
              {o.order_items.map((i) => (
                <li key={i.id} className="flex justify-between gap-4 py-2.5">
                  <span>
                    {i.product_name}
                    {i.color_name ? <> · <strong className="font-medium">{i.color_name}</strong></> : null} · taille <strong className="font-medium">{i.size_label}</strong> × {i.quantity}
                  </span>
                  <span className="tabular-nums">{formatPrice(i.unit_price_mad * i.quantity, 'fr')}</span>
                </li>
              ))}
              <li className="flex justify-between py-2.5 text-mute">
                <span>Livraison</span>
                <span>{o.shipping_mad ? formatPrice(o.shipping_mad, 'fr') : 'Offerte'}</span>
              </li>
              <li className="flex justify-between py-2.5 font-medium">
                <span>Total</span>
                <span className="tabular-nums">{formatPrice(o.total_mad, 'fr')}</span>
              </li>
            </ul>
          </Card>

          <Card title="Statut">
            <StatusButtons orderId={o.id} status={o.status} />
            <p className="mt-3 text-xs text-mute">Annuler remet les pièces en stock. Pour un échange de taille, ajustez le stock dans « Produits ».</p>
          </Card>
        </div>

        <div className="grid content-start gap-4">
          <Card title="Paiement">
            <p className="text-sm text-ink">{PAYMENT_METHOD_LABEL[o.payment_method]}</p>
            <div className="mt-3 flex items-center gap-3">
              <PaymentStatusSelect orderId={o.id} status={o.payment_status} />
              {o.payment_ref ? <span className="text-xs text-mute">Réf. {o.payment_ref}</span> : null}
            </div>
          </Card>

          <Card title="Note interne">
            <NoteForm orderId={o.id} note={o.admin_note} />
          </Card>

          {attribution.length ? (
            <Card title="Publicité d’origine">
              <dl className="grid gap-1.5 text-xs">
                {attribution.map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-3">
                    <dt className="text-mute">{k}</dt>
                    <dd className="truncate text-ink">{v}</dd>
                  </div>
                ))}
              </dl>
            </Card>
          ) : null}

          <Card title="Historique">
            <ol className="grid gap-3 border-s border-line ps-4 text-sm">
              {o.order_events.map((e) => (
                <li key={e.id} className="relative">
                  <span className="absolute -start-[21px] top-1.5 size-2.5 rounded-full border-2 border-white bg-burgundy" />
                  <p className="text-ink">{describe(e)}</p>
                  <p className="text-xs text-mute">{formatDateTime(e.created_at)}</p>
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </div>
    </>
  )
}

function Info({ label, value, wide }: { label: string; value: React.ReactNode; wide?: boolean }) {
  return (
    <div className={wide ? 'sm:col-span-2' : ''}>
      <dt className="text-xs text-mute">{label}</dt>
      <dd className="mt-0.5 text-ink">{value}</dd>
    </div>
  )
}

function describe(e: Order['order_events'][number]) {
  if (e.kind === 'status') {
    const to = STATUS_LABEL[e.data?.to as OrderStatus] ?? e.data?.to
    return `Statut : ${to}${e.message ? ` — ${e.message}` : ''}`
  }
  if (e.kind === 'payment' && e.data?.to) return `Paiement : ${PAYMENT_STATUS_LABEL[e.data.to as PaymentStatus] ?? e.data.to}`
  if (e.kind === 'note') return `Note : ${e.message}`
  return e.message
}
