import Link from 'next/link'
import { Suspense } from 'react'
import { Ornament } from '@/components/brand/Logo'
import { CheckoutSteps, ClearCart } from '@/components/store/Checkout'
import { formatPrice, orderRef, whatsappLink } from '@/lib/format'
import { dictionaryFor } from '@/lib/i18n/dictionaries'
import { getLocale } from '@/lib/i18n/get-dictionary'
import type { Locale } from '@/lib/i18n/config'
import { isSupabaseConfigured } from '@/lib/supabase/env'
import { createPublicClient } from '@/lib/supabase/public'
import type { OrderReceipt } from '@/lib/types'

export const metadata = { robots: { index: false } }

export default async function ThanksPage({ params }: PageProps<'/[locale]/merci/[orderId]'>) {
  const locale = await getLocale()
  const t = dictionaryFor(locale)
  return (
    <main>
      <CheckoutSteps step="done" />
      <div className="h-10 md:h-14" />
      <Suspense fallback={<p className="py-24 text-center text-mute">…</p>}>
        <Receipt locale={locale} orderId={params.then((p) => p.orderId)} />
      </Suspense>
      <p className="pb-16 text-center">
        <Link href={`/${locale}`} className="text-sm text-burgundy underline decoration-gold underline-offset-4">
          {t.thanks.back}
        </Link>
      </p>
    </main>
  )
}

async function Receipt({ locale, orderId }: { locale: Locale; orderId: Promise<string> }) {
  const t = dictionaryFor(locale)
  const id = await orderId
  const receipt = await loadReceipt(id)
  if (!receipt) return <p className="py-24 text-center text-mute">{t.thanks.notFound}</p>

  const ref = orderRef(receipt.order_number)
  const firstName = receipt.full_name.split(' ')[0]
  const wa = receipt.whatsapp_number ? whatsappLink(receipt.whatsapp_number, whatsappText(receipt, locale)) : null
  const cardState =
    receipt.payment_method === 'card' && receipt.payment_status !== 'paid'
      ? receipt.payment_status === 'failed'
        ? 'failed'
        : 'pending'
      : null

  return (
    <section className="mx-auto max-w-xl px-5 pb-12">
      <ClearCart />
      <div className="bg-white px-6 py-10 text-center shadow-[0_20px_60px_rgba(77,19,28,0.08)] md:px-10">
        <h1 className="font-display text-5xl font-light italic text-burgundy rtl:not-italic">{t.thanks.title}</h1>
        <p className="mt-3 text-ink">{t.thanks.subtitle(firstName)}</p>
        <p className="eyebrow mt-4 text-gold">
          {t.thanks.number} {ref}
        </p>
        <Ornament className="mx-auto mt-6 w-32 text-gold" />

        {cardState ? (
          <div className="mt-8 border-s-2 border-burgundy bg-burgundy/5 px-4 py-3 text-start text-sm text-burgundy">
            <p>{cardState === 'failed' ? t.thanks.cardFailed : t.thanks.cardPending}</p>
            {cardState === 'failed' ? (
              <a href={`/api/payments/cmi/start?order=${receipt.id}`} className="mt-2 inline-block underline">
                {t.thanks.retryPayment}
              </a>
            ) : null}
          </div>
        ) : null}

        <ul className="mt-8 divide-y divide-line border-y border-line text-start text-sm">
          {receipt.items.map((i) => (
            <li key={`${i.product_name}-${i.color_name}-${i.size_label}`} className="flex justify-between gap-4 py-3">
              <span>
                {i.product_name}
                {i.color_name ? ` · ${i.color_name}` : ''} · {t.checkout.size} {i.size_label} × {i.quantity}
              </span>
              <span className="whitespace-nowrap">{formatPrice(i.unit_price_mad * i.quantity, locale)}</span>
            </li>
          ))}
          <li className="flex justify-between py-3 text-mute">
            <span>{t.checkout.shipping}</span>
            <span>{receipt.shipping_mad ? formatPrice(receipt.shipping_mad, locale) : t.checkout.free}</span>
          </li>
          <li className="flex justify-between py-3 font-display text-xl">
            <span>{t.checkout.total}</span>
            <span>{formatPrice(receipt.total_mad, locale)}</span>
          </li>
        </ul>

        <div className="mt-8 text-start">
          <p className="eyebrow text-gold">{t.thanks.next}</p>
          <ol className="mt-4 space-y-3">
            {t.thanks.steps[receipt.payment_method].map((step, i) => (
              <li key={step} className="flex gap-4 text-[0.95rem] text-ink">
                <span className="grid size-7 shrink-0 place-items-center rounded-full border border-gold font-display text-gold">{i + 1}</span>
                <span className="pt-0.5">{step}</span>
              </li>
            ))}
          </ol>
        </div>

        {receipt.bank ? (
          <dl className="mt-8 grid gap-2 bg-ivory p-5 text-start text-sm">
            <p className="font-display text-xl text-burgundy">{t.thanks.bank.title}</p>
            <Row label={t.thanks.bank.name} value={receipt.bank.name} />
            <Row label={t.thanks.bank.holder} value={receipt.bank.holder} />
            <Row label={t.thanks.bank.rib} value={receipt.bank.rib} mono />
            <Row label={t.thanks.bank.amount} value={formatPrice(receipt.total_mad, locale)} />
          </dl>
        ) : null}

        {wa ? (
          <a
            href={wa}
            target="_blank"
            rel="noopener noreferrer"
            className={`mt-8 flex h-14 items-center justify-center gap-3 text-[0.8125rem] font-medium uppercase tracking-[0.2em] rtl:text-base rtl:tracking-normal ${
              receipt.payment_method === 'bank_transfer'
                ? 'bg-[#1f7a4d] text-white'
                : 'border border-line text-ink'
            }`}
          >
            <WhatsAppIcon />
            {receipt.payment_method === 'bank_transfer' ? t.thanks.whatsappCta : t.thanks.contact}
          </a>
        ) : null}
      </div>
    </section>
  )
}

async function loadReceipt(id: string): Promise<OrderReceipt | null> {
  if (!isSupabaseConfigured || !/^[0-9a-f-]{36}$/i.test(id)) return null
  const { data, error } = await createPublicClient().rpc('get_order_receipt', { p_order_id: id })
  if (error) {
    console.error('get_order_receipt failed', error)
    return null
  }
  return (data as OrderReceipt | null) ?? null
}

function whatsappText(r: OrderReceipt, locale: Locale) {
  const t = dictionaryFor(locale)
  const items = r.items.map((i) => `${i.quantity} × ${i.product_name} (${i.color_name ? `${i.color_name}, ` : ''}${t.checkout.size} ${i.size_label})`).join('\n')
  return `${t.thanks.whatsappMessage(orderRef(r.order_number))}\n${items}\n${t.checkout.total} : ${formatPrice(r.total_mad, locale)}\n${t.checkout.methods[r.payment_method].label}`
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-mute">{label}</dt>
      <dd className={`text-end text-ink ${mono ? 'font-mono text-[0.8rem]' : ''}`} dir={mono ? 'ltr' : undefined}>
        {value || '—'}
      </dd>
    </div>
  )
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" fill="currentColor" aria-hidden>
      <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.3 2.2 2.2 0 0 0 .1-1.3c0-.1-.2-.2-.4-.3z" />
    </svg>
  )
}
