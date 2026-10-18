import Image from 'next/image'
import Link from 'next/link'
import { Suspense } from 'react'
import { Ornament } from '@/components/brand/Logo'
import { ClearCart } from '@/components/store/Checkout'
import { WhatsAppIcon } from '@/components/store/icons'
import { getStorefront } from '@/lib/catalog'
import { displayPhone, formatPrice, normalizeMoroccanPhone, orderRef, whatsappLink } from '@/lib/format'
import { dictionaryFor } from '@/lib/i18n/dictionaries'
import { getLocale } from '@/lib/i18n/get-dictionary'
import type { Locale } from '@/lib/i18n/config'
import { imagesFor } from '@/lib/product'
import { isSupabaseConfigured, mediaUrl } from '@/lib/supabase/env'
import { createPublicClient } from '@/lib/supabase/public'
import type { OrderReceipt } from '@/lib/types'

export const metadata = { robots: { index: false } }

export default async function ThanksPage({ params }: PageProps<'/[locale]/merci/[orderId]'>) {
  const locale = await getLocale()
  return (
    // Blush light behind the card.
    <main className="relative overflow-hidden bg-ivory-light px-4 pb-20 pt-10 md:pt-16">
      <span aria-hidden className="pointer-events-none absolute left-1/2 top-0 size-[620px] -translate-x-1/2 -translate-y-1/3 rounded-full bg-[#f1d9d6]/60 blur-3xl" />
      <Suspense fallback={<p className="relative py-24 text-center text-mute">…</p>}>
        <Receipt locale={locale} orderId={params.then((p) => p.orderId)} />
      </Suspense>
    </main>
  )
}

async function Receipt({ locale, orderId }: { locale: Locale; orderId: Promise<string> }) {
  const t = dictionaryFor(locale)
  const id = await orderId
  const receipt = await loadReceipt(id)
  if (!receipt) {
    return (
      <div className="relative py-24 text-center">
        <p className="text-mute">{t.thanks.notFound}</p>
        <BackButton locale={locale} label={t.thanks.back} />
      </div>
    )
  }

  const ref = orderRef(receipt.order_number)
  const photo = await photoFor(receipt.items[0])
  const phone = receipt.whatsapp_number ? normalizeMoroccanPhone(receipt.whatsapp_number) : null
  const wa = receipt.whatsapp_number ? whatsappLink(receipt.whatsapp_number, whatsappText(receipt, locale)) : null
  const cardState =
    receipt.payment_method === 'card' && receipt.payment_status !== 'paid'
      ? receipt.payment_status === 'failed'
        ? 'failed'
        : 'pending'
      : null

  return (
    <section className="relative mx-auto max-w-[560px] text-center">
      <ClearCart />

      {/* The coat in an arch, sealed with a burgundy check and a few gold sparkles. */}
      <div className="relative mx-auto w-[min(62vw,250px)]">
        <Sparkle className="absolute -start-8 top-10 size-5 animate-pulse text-gold" />
        <Sparkle className="absolute -end-6 top-1/3 size-3.5 animate-pulse text-gold-light [animation-delay:0.6s]" />
        <Sparkle className="absolute -start-4 bottom-16 size-3 animate-pulse text-gold-light [animation-delay:1.2s]" />
        <div className="relative aspect-[4/5] overflow-hidden rounded-b-[28px] rounded-t-[min(31vw,125px)] border-[6px] border-white bg-ivory-dark shadow-[0_24px_50px_-20px_rgba(77,19,28,0.35)]">
          {photo ? (
            <Image src={mediaUrl(photo)} alt="" fill preload sizes="250px" className="object-cover object-top" />
          ) : (
            <Ornament className="absolute inset-x-8 top-1/2 -translate-y-1/2 text-gold" />
          )}
        </div>
        <span className="absolute -bottom-3 -end-3 grid size-16 animate-[pop_0.5s_cubic-bezier(0.22,1,0.36,1)_0.2s_both] place-items-center rounded-full border-4 border-ivory-light bg-burgundy text-ivory shadow-[0_10px_24px_-6px_rgba(77,19,28,0.55)]">
          <svg viewBox="0 0 24 24" className="size-7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M5 12.5l4.5 4.5L19 7.5" />
          </svg>
        </span>
      </div>

      <p className="eyebrow mt-10 text-burgundy">— {t.thanks.received}</p>
      <h1 className="mt-4 font-display text-[2.5rem] font-medium leading-[1.1] text-ink md:text-[3.25rem] rtl:leading-[1.4]">
        {t.thanks.heading[0]} <em className="text-gold rtl:not-italic">{t.thanks.heading[1]}</em>
      </h1>
      <Ornament className="mx-auto mt-4 w-28 text-gold" />
      <p className="mx-auto mt-5 max-w-[440px] leading-relaxed text-mute">{t.thanks.team}</p>

      {cardState ? (
        <div className="mt-7 rounded-2xl border-s-2 border-burgundy bg-burgundy/5 px-5 py-4 text-start text-sm text-burgundy">
          <p>{cardState === 'failed' ? t.thanks.cardFailed : t.thanks.cardPending}</p>
          {cardState === 'failed' ? (
            <a href={`/api/payments/cmi/start?order=${receipt.id}`} className="mt-2 inline-block underline">
              {t.thanks.retryPayment}
            </a>
          ) : null}
        </div>
      ) : null}

      <div className="mt-8 rounded-[22px] border border-line bg-white/80 px-5 py-2 text-start text-[0.9375rem] shadow-[0_20px_50px_-30px_rgba(77,19,28,0.25)] backdrop-blur md:px-7">
        <Line label={t.thanks.number} value={ref} />
        {receipt.items.map((i) => (
          <div key={`${i.product_name}-${i.color_name}-${i.size_label}`}>
            <Line label={t.checkout.product} value={i.product_name} />
            <Line label={t.thanks.colorSize} value={[i.color_name, i.size_label].filter(Boolean).join(' · ')} />
            {i.quantity > 1 ? <Line label={t.product.quantity} value={`× ${i.quantity}`} /> : null}
          </div>
        ))}
        <Line label={t.checkout.shipping} value={receipt.shipping_mad ? formatPrice(receipt.shipping_mad, locale) : t.checkout.free} />
        <div className="flex items-baseline justify-between gap-4 py-4">
          <span className="text-ink">{t.checkout.total}</span>
          <span className="font-display text-2xl font-semibold text-burgundy">{formatPrice(receipt.total_mad, locale)}</span>
        </div>
      </div>

      <div className="mt-8 text-start">
        <p className="eyebrow text-center text-gold">{t.thanks.next}</p>
        <ol className="mt-5 space-y-3">
          {t.thanks.steps[receipt.payment_method].map((step, i) => (
            <li key={step} className="flex items-center gap-4 rounded-2xl bg-ivory px-4 py-3.5 text-[0.9375rem] text-ink">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-white font-display text-lg text-burgundy shadow-[0_0_0_1px_var(--color-gold-light)]">
                {i + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
      </div>

      {receipt.bank ? (
        <dl className="mt-8 grid gap-2 rounded-[22px] bg-ivory p-5 text-start text-sm md:p-6">
          <p className="font-display text-xl text-burgundy">{t.thanks.bank.title}</p>
          <Row label={t.thanks.bank.name} value={receipt.bank.name} />
          <Row label={t.thanks.bank.holder} value={receipt.bank.holder} />
          <Row label={t.thanks.bank.rib} value={receipt.bank.rib} mono />
          <Row label={t.thanks.bank.amount} value={formatPrice(receipt.total_mad, locale)} />
        </dl>
      ) : null}

      {wa && receipt.payment_method === 'bank_transfer' ? (
        <a
          href={wa}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 flex h-14 items-center justify-center gap-3 rounded-full bg-[#1f7a4d] text-[0.8125rem] font-semibold uppercase tracking-[0.14em] text-white rtl:text-base rtl:tracking-normal"
        >
          <WhatsAppIcon className="size-5" />
          {t.thanks.whatsappCta}
        </a>
      ) : null}

      {wa && phone ? (
        <p className="mt-8 text-[0.9375rem] text-mute">
          {t.thanks.question}{' '}
          <a href={wa} target="_blank" rel="noopener noreferrer" dir="ltr" className="inline-flex items-center gap-1.5 font-semibold text-burgundy underline decoration-gold underline-offset-4">
            <WhatsAppIcon className="size-4 text-[#25d366]" />
            {displayPhone(phone)}
          </a>
        </p>
      ) : null}

      <BackButton locale={locale} label={t.thanks.back} />
    </section>
  )
}

function BackButton({ locale, label }: { locale: Locale; label: string }) {
  return (
    <Link
      href={`/${locale}`}
      className="mt-8 flex h-14 w-full items-center justify-center rounded-full bg-burgundy text-[0.8125rem] font-semibold uppercase tracking-[0.16em] text-ivory shadow-[0_10px_24px_-8px_rgba(77,19,28,0.55)] transition-colors hover:bg-burgundy-deep rtl:text-base rtl:tracking-normal"
    >
      {label}
    </Link>
  )
}

// Four-pointed star.
function Sparkle({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M12 0c.6 6.4 5.6 11.4 12 12-6.4.6-11.4 5.6-12 12-.6-6.4-5.6-11.4-12-12C6.4 11.4 11.4 6.4 12 0z" />
    </svg>
  )
}

// The photo of the first piece ordered, in its colour. Orders keep only the
// names, so the piece is found again in the catalogue by its name.
async function photoFor(item: OrderReceipt['items'][number] | undefined) {
  if (!item) return null
  const { products } = await getStorefront()
  const product = products.find((p) => p.name_fr === item.product_name || p.name_ar === item.product_name)
  if (!product) return null
  const color = product.product_colors.find((c) => c.name_fr === item.color_name || c.name_ar === item.color_name)
  return imagesFor(product, color?.id ?? null)[0]?.path ?? null
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

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-line/70 py-3.5">
      <span className="text-mute">{label}</span>
      <span className="text-end font-semibold text-ink">{value || '—'}</span>
    </div>
  )
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
