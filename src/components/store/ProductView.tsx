'use client'

import dynamic from 'next/dynamic'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState, useTransition } from 'react'
import { dictionaryFor } from '@/lib/i18n/dictionaries'
import { formatPrice, normalizeMoroccanPhone, whatsappLink } from '@/lib/format'
import { lines, pick } from '@/lib/localize'
import { placeOrder, type OrderErrorCode } from '@/lib/orders/actions'
import { colorsOf, defaultColor, imagesFor, isSoldOut, sizesFor } from '@/lib/product'
import { mediaUrl } from '@/lib/supabase/env'
import { getAttribution, guessSource } from '@/lib/tracking/attribution'
import { adCookies, track } from '@/lib/tracking/client'
import { PAYMENT_METHODS, type PaymentMethod, type Product, type ProductImage } from '@/lib/types'
import { CITIES } from './Checkout'
import { ChevronIcon, CloseIcon, CubeIcon, PerkIcon, UserIcon, WhatsAppIcon } from './icons'
import { QuantityStepper } from './QuantityStepper'
import { lockScroll, scrollToId } from './scroll'
import { Accent, Eyebrow } from './Showcase'
import { MAX_PER_SIZE, maxQuantity, useStore } from './StoreContext'
import { primaryButton, secondaryButton } from './ui'
import { Lens, useLens, ZoomViewer } from './ZoomViewer'

const ModelViewer = dynamic(() => import('./ModelViewer'), { ssr: false })

const LOW_STOCK = 3

type Field = 'fullName' | 'phone' | 'email' | 'city' | 'address'

const FIELD_OF: Partial<Record<OrderErrorCode, Field>> = {
  INVALID_NAME: 'fullName',
  INVALID_PHONE: 'phone',
  INVALID_EMAIL: 'email',
  INVALID_CITY: 'city',
  INVALID_ADDRESS: 'address',
}

// Small caps label above the pickers and the order form.
const label =
  'flex items-center justify-between gap-3 text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-ink rtl:text-sm rtl:tracking-normal'

// Product page: photos on one side; name, price, promises, colours, sizes and
// the order form on the other, then the description. A bar with the buy
// buttons follows once the form scrolls away.
export function ProductView({ product }: { product: Product }) {
  const { locale, settings, addToCart, openPanel } = useStore()
  const t = dictionaryFor(locale)
  const router = useRouter()
  const colors = colorsOf(product)
  const [colorId, setColorId] = useState<string | null>(() => defaultColor(product)?.id ?? null)
  const color = colors.find((c) => c.id === colorId) ?? null
  const [sizeId, setSizeId] = useState<string | null>(null)
  const [quantity, setQuantity] = useState(1)
  // Bumped when someone tries to buy without a size, to shake the size picker.
  const [nudge, setNudge] = useState(0)
  const formRef = useRef<HTMLFormElement>(null)
  const buttons = useRef<HTMLDivElement>(null)
  const [barVisible, setBarVisible] = useState(false)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<{ code: OrderErrorCode; field?: Field } | null>(null)
  const methods = PAYMENT_METHODS.filter((m) => settings.payments[m])
  const [method, setMethod] = useState<PaymentMethod | null>(methods[0] ?? null)

  const sizes = sizesFor(product, colorId)
  const selected = sizes.find((s) => s.id === sizeId && s.stock > 0)
  // The whole product, or just the picked colour, has nothing left.
  const soldOut = isSoldOut(product) || sizes.every((s) => s.stock <= 0)
  const name = pick(product, 'name', locale)
  const price = formatPrice(product.price_mad, locale)
  const total = formatPrice(product.price_mad * quantity + settings.shipping_fee_mad, locale)
  const images = imagesFor(product, colorId)
  const cover = images[0]
  const guide = pick(product, 'size_guide', locale)
  const shake = nudge > 0 && !selected
  const perks = settings.whatsapp_number ? (['cod', 'delivery', 'exchange', 'advice'] as const) : (['cod', 'delivery', 'exchange'] as const)

  const { price_mad, slug, name_fr } = product
  useEffect(() => {
    track('ViewContent', { value: price_mad, contentId: slug, contentName: name_fr })
  }, [price_mad, slug, name_fr])

  useEffect(() => {
    const el = buttons.current
    if (!el) return
    const io = new IntersectionObserver(([entry]) => setBarVisible(!entry.isIntersecting && entry.boundingClientRect.top < 0))
    io.observe(el)
    return () => io.disconnect()
  }, [])

  // Lets the floating WhatsApp button move up above the bar.
  useEffect(() => {
    document.documentElement.toggleAttribute('data-buybar', barVisible)
    return () => document.documentElement.removeAttribute('data-buybar')
  }, [barVisible])

  function askForSize() {
    setNudge((n) => n + 1)
    scrollToId('taille', 'center')
  }

  function addToBag() {
    if (!selected) return askForSize()
    addToCart(selected.id, quantity)
    setQuantity(1)
    openPanel('cart')
  }

  // From the bar: back up to the order form.
  function goToForm() {
    if (!selected) return askForSize()
    scrollToId('commande', 'center')
    formRef.current?.querySelector<HTMLInputElement>('input[name="fullName"]')?.focus({ preventScroll: true })
  }

  function openGuide() {
    const el = document.getElementById('guide')
    if (el instanceof HTMLDetailsElement) el.open = true
    scrollToId('guide', 'center')
  }

  function showError(code: OrderErrorCode) {
    const field = FIELD_OF[code]
    setError({ code, field })
    if (field) formRef.current?.querySelector<HTMLInputElement>(`input[name="${field}"]`)?.focus()
  }

  // Orders the picked size straight from this page, without going through the cart.
  function submit(form: HTMLFormElement) {
    if (!selected) return askForSize()
    const fd = new FormData(form)
    const value = (k: string) => String(fd.get(k) ?? '').trim()
    const phone = value('phone')

    // Quick checks before the round trip; the server checks everything again.
    const local: [boolean, OrderErrorCode][] = [
      [value('fullName').length >= 2, 'INVALID_NAME'],
      [normalizeMoroccanPhone(phone) !== null, 'INVALID_PHONE'],
      [value('city').length >= 2, 'INVALID_CITY'],
      [value('address').length >= 5, 'INVALID_ADDRESS'],
      [method !== null, 'PAYMENT_METHOD_UNAVAILABLE'],
    ]
    const failed = local.find(([ok]) => !ok)
    if (failed) return showError(failed[1])

    const attribution = getAttribution()
    const cleanAttribution = Object.fromEntries(
      Object.entries(attribution).filter(([k, v]) => k !== 'at' && typeof v === 'string'),
    ) as Record<string, string>

    startTransition(async () => {
      const res = await placeOrder({
        fullName: value('fullName'),
        phone,
        email: value('email'),
        city: value('city'),
        address: value('address'),
        source: guessSource(attribution) ?? null,
        paymentMethod: method!,
        items: [{ sizeId: selected.id, quantity }],
        locale,
        attribution: cleanAttribution,
        website: value('website') || undefined,
        ...adCookies(),
        pageUrl: window.location.href.split('#')[0],
      })
      if (!res.ok) return showError(res.error)
      track('Purchase', { value: res.totalMad, contentId: slug, contentName: name_fr, quantity, eventId: res.orderId })
      if (res.redirectTo.startsWith('/api/')) window.location.href = res.redirectTo
      else router.push(res.redirectTo)
    })
  }

  const input = (f: Field) =>
    `block w-full rounded-[10px] border bg-white px-4 py-3.5 text-[1rem] text-ink outline-none transition-colors placeholder:text-mute/60 focus:border-burgundy ${
      error?.field === f ? 'border-burgundy' : 'border-line'
    }`

  return (
    <>
      <div className="mx-auto max-w-[1280px] px-4 pb-14 pt-5 md:px-8 md:pb-20 md:pt-8">
        <nav aria-label={name} className="mb-5 flex flex-wrap items-center gap-2 text-[0.8125rem] text-mute md:mb-7">
          <Link href={`/${locale}`} prefetch className="transition-colors hover:text-burgundy">
            {t.nav.home}
          </Link>
          <span aria-hidden className="text-[0.6875rem] text-mute/60 rtl:-scale-x-100">
            ›
          </span>
          <span>{t.product.categoryName}</span>
          <span aria-hidden className="text-[0.6875rem] text-mute/60 rtl:-scale-x-100">
            ›
          </span>
          <span className="font-medium text-ink">{name}</span>
        </nav>

        <section className="grid gap-8 md:grid-cols-[1.1fr_1fr] md:gap-10 lg:gap-14">
          {/* A new colour starts its photos from the first one. */}
          <Gallery key={colorId ?? 'all'} product={product} images={images} badge={soldOut ? null : t.product.new} />

          <div className="min-w-0">
            <Eyebrow>{`${t.product.collection} · ${t.product.categoryName}`}</Eyebrow>
            <h1 className="mt-3.5 font-display text-[2.5rem] font-medium leading-[1.05] text-ink md:text-[3.25rem] rtl:leading-[1.3]">
              <Accent text={name} />
            </h1>
            {pick(product, 'subtitle', locale) ? <p className="mt-2 text-mute">{pick(product, 'subtitle', locale)}</p> : null}

            <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-line pt-6">
              <p className="font-display text-[2.5rem] font-semibold leading-none text-burgundy">{price}</p>
              <span
                className={`rounded-full px-3 py-1.5 text-[0.6875rem] font-semibold uppercase tracking-[0.08em] rtl:text-xs rtl:tracking-normal ${
                  soldOut ? 'bg-ivory-dark text-mute' : 'bg-burgundy text-ivory shadow-[0_4px_10px_-2px_rgba(77,19,28,0.4)]'
                }`}
              >
                {soldOut ? t.product.outOfStock : t.product.new}
              </span>
            </div>
            {soldOut ? null : selected && selected.stock <= LOW_STOCK ? (
              <p className="mt-2.5 flex items-center gap-2 text-[0.8125rem] font-medium text-burgundy">
                <span className="size-2 animate-pulse rounded-full bg-burgundy" />
                {t.product.lastPieces(selected.stock)}
              </p>
            ) : (
              <p className="mt-2.5 flex items-center gap-2 text-[0.8125rem] font-medium text-[#3f7a55]">
                <span className="size-2 animate-pulse rounded-full bg-[#3f7a55]" />
                {t.product.inStock}
              </p>
            )}

            <ul className="mt-6 grid grid-cols-2 gap-2.5">
              {perks.map((key) => (
                <li key={key} className="flex items-center gap-2.5 rounded-xl bg-ivory px-3 py-3 text-[0.75rem] leading-snug text-mute rtl:text-[0.8125rem]">
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg border border-line bg-white text-burgundy">
                    <PerkIcon name={key} className="size-5" />
                  </span>
                  <span>
                    <strong className="block font-semibold text-ink">{t.perks[key].title}</strong>
                    {key === 'cod' && settings.payments.bank_transfer ? t.perks.cod.withTransfer : t.perks[key].text}
                  </span>
                </li>
              ))}
            </ul>

            {colors.length ? (
              <div className="mt-7">
                <p id="color-label" className={label}>
                  {t.product.color}
                </p>
                <div role="radiogroup" aria-labelledby="color-label" className="mt-3 flex flex-wrap gap-2">
                  {colors.map((c) => {
                    const on = c.id === colorId
                    const out = sizesFor(product, c.id).every((s) => s.stock <= 0)
                    return (
                      <button
                        key={c.id}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        onClick={() => {
                          setColorId(c.id)
                          setSizeId(null)
                        }}
                        className={`inline-flex items-center gap-2 rounded-full border-[1.5px] py-2 pe-4 ps-2.5 text-[0.8125rem] font-medium transition-colors ${
                          on ? 'border-burgundy bg-burgundy text-ivory' : 'border-line bg-white text-ink hover:border-burgundy'
                        } ${out ? 'line-through decoration-1 opacity-60' : ''}`}
                      >
                        <span className={`size-[18px] shrink-0 rounded-full border-2 ${on ? 'border-ivory/60' : 'border-ink/10'}`} style={{ background: c.hex }} />
                        {pick(c, 'name', locale)}
                      </button>
                    )
                  })}
                </div>
              </div>
            ) : null}

            <div id="taille" className="mt-7">
              <p id="size-label" className={`${label} ${shake ? 'text-burgundy' : ''}`}>
                {t.product.size}
                {guide ? (
                  <button type="button" onClick={openGuide} className="normal-case tracking-normal text-burgundy underline underline-offset-2">
                    {t.product.sizeGuide}
                  </button>
                ) : null}
              </p>
              <div
                key={nudge}
                role="radiogroup"
                aria-labelledby="size-label"
                className={`mt-3 grid grid-cols-5 gap-2 ${shake ? 'animate-[shake_0.5s_ease-in-out]' : ''}`}
              >
                {sizes.map((s) => {
                  const out = s.stock <= 0
                  const on = s.id === selected?.id
                  return (
                    <button
                      key={s.id}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      disabled={out}
                      onClick={() => {
                        setSizeId(s.id)
                        setQuantity((q) => Math.min(q, maxQuantity(s)))
                      }}
                      className={`relative h-12 rounded-[10px] border-[1.5px] text-sm font-semibold transition-colors ${
                        out
                          ? 'cursor-not-allowed border-line text-mute/50'
                          : on
                            ? 'border-burgundy bg-burgundy text-ivory shadow-[0_4px_12px_-2px_rgba(77,19,28,0.3)]'
                            : 'border-line bg-white text-ink hover:border-burgundy'
                      }`}
                    >
                      {s.label}
                      {out ? (
                        <>
                          <span aria-hidden className="absolute inset-0 m-auto h-px w-[70%] -rotate-[20deg] bg-mute/40" />
                          <span className="sr-only"> — {t.product.soldOut}</span>
                        </>
                      ) : null}
                    </button>
                  )
                })}
              </div>
              {shake ? <p className="mt-2 text-sm text-burgundy">{t.product.chooseSize}</p> : null}
            </div>

            <div className="mt-6 flex items-center justify-between gap-4">
              <span className={label}>{t.product.quantity}</span>
              <QuantityStepper
                value={quantity}
                max={selected ? maxQuantity(selected) : MAX_PER_SIZE}
                onChange={setQuantity}
                label={t.product.quantity}
              />
            </div>

            <form
              id="commande"
              ref={formRef}
              noValidate
              onSubmit={(e) => {
                e.preventDefault()
                submit(e.currentTarget)
              }}
              className="mt-6"
            >
              <div className="rounded-2xl border border-line bg-ivory p-4 md:p-6">
                <p className={`${label} justify-start`}>
                  <UserIcon className="size-4 text-burgundy" />
                  {t.product.yourInfo}
                </p>
                <div className="mt-3.5 grid gap-3">
                  <input
                    name="fullName"
                    autoComplete="name"
                    required
                    maxLength={120}
                    aria-label={t.checkout.fullName}
                    placeholder={t.checkout.fullName}
                    className={input('fullName')}
                  />
                  <div className="grid grid-cols-2 gap-2.5">
                    <input
                      name="phone"
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      dir="ltr"
                      required
                      maxLength={20}
                      aria-label={t.checkout.phone}
                      placeholder={`${t.checkout.phone} (06…)`}
                      className={`${input('phone')} rtl:text-right`}
                    />
                    <input
                      name="city"
                      list="ma-cities"
                      autoComplete="address-level2"
                      required
                      maxLength={80}
                      aria-label={t.checkout.city}
                      placeholder={t.checkout.city}
                      className={input('city')}
                    />
                  </div>
                  <datalist id="ma-cities">
                    {CITIES.map(([fr, ar]) => (
                      <option key={fr} value={locale === 'ar' ? ar : fr} />
                    ))}
                  </datalist>
                  <input
                    name="address"
                    autoComplete="street-address"
                    required
                    maxLength={300}
                    aria-label={t.checkout.address}
                    placeholder={t.checkout.address}
                    className={input('address')}
                  />
                  <input
                    name="email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    dir="ltr"
                    maxLength={200}
                    aria-label={t.checkout.email}
                    placeholder={`${t.checkout.email} (${t.checkout.optional})`}
                    className={`${input('email')} rtl:text-right`}
                  />
                  {/* Honeypot for bots */}
                  <input name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />

                  {methods.length > 1 ? (
                    <div role="radiogroup" aria-label={t.checkout.payment} className="flex flex-wrap gap-2">
                      {methods.map((m) => (
                        <button
                          key={m}
                          type="button"
                          role="radio"
                          aria-checked={method === m}
                          onClick={() => setMethod(m)}
                          className={`rounded-full border-[1.5px] px-4 py-2 text-[0.8125rem] font-medium transition-colors ${
                            method === m ? 'border-burgundy bg-burgundy text-ivory' : 'border-line bg-white text-ink hover:border-burgundy'
                          }`}
                        >
                          {t.checkout.methods[m].label}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>

              {error ? (
                <p role="alert" className="mt-4 rounded-[10px] border-s-2 border-burgundy bg-burgundy/5 px-4 py-3 text-sm text-burgundy">
                  {t.checkout.errors[error.code]}
                </p>
              ) : null}

              <div ref={buttons} className="mt-4">
                <button
                  type="submit"
                  disabled={soldOut || pending || methods.length === 0}
                  className="group flex h-[3.75rem] w-full items-center justify-center gap-2.5 rounded-[14px] bg-burgundy px-6 text-[0.875rem] font-semibold uppercase tracking-[0.12em] text-ivory shadow-[0_8px_20px_-6px_rgba(77,19,28,0.55)] transition-[background-color,translate,box-shadow] duration-300 ease-luxe hover:-translate-y-0.5 hover:bg-burgundy-deep disabled:translate-y-0 disabled:cursor-not-allowed disabled:bg-mute/60 disabled:shadow-none rtl:text-base rtl:tracking-normal"
                >
                  {soldOut ? (
                    t.product.outOfStock
                  ) : pending ? (
                    t.checkout.submitting
                  ) : (
                    <>
                      <span>
                        {t.product.order} · {total}
                      </span>
                      <span aria-hidden className="transition-transform duration-300 group-hover:translate-x-1 rtl:-scale-x-100 rtl:group-hover:-translate-x-1">
                        →
                      </span>
                    </>
                  )}
                </button>
                <button type="button" onClick={addToBag} disabled={soldOut} className={`${secondaryButton} mt-2.5 h-12 w-full rounded-[14px]`}>
                  {t.product.addToCart}
                </button>
              </div>
              <p className="mt-3 text-center text-[0.75rem] leading-relaxed text-mute">
                {t.product.secure}{' '}
                <Link href={`/${locale}/confidentialite`} className="underline underline-offset-2 hover:text-burgundy">
                  {t.footer.legal.privacy}
                </Link>
              </p>
            </form>

            {settings.whatsapp_number ? (
              <a
                href={whatsappLink(settings.whatsapp_number, t.contactBar.message)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => track('Contact')}
                className="mt-5 flex items-center justify-center gap-2 text-sm text-ink underline decoration-gold underline-offset-4"
              >
                <WhatsAppIcon className="size-5 text-[#25d366]" />
                {t.contactBar.button}
              </a>
            ) : null}

            <Accordions product={product} />
          </div>
        </section>

        <Description product={product} />
      </div>

      <div
        inert={!barVisible}
        className={`fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 border-t border-line bg-ivory-light/95 backdrop-blur transition-transform duration-300 ease-luxe md:bottom-0 ${
          barVisible ? 'translate-y-0' : 'translate-y-[calc(100%+5rem)]'
        }`}
      >
        <div className="mx-auto flex max-w-[1280px] items-center gap-3 px-4 py-2.5 md:gap-5 md:px-8 md:py-3">
          {cover ? (
            <div className="relative hidden h-16 w-12 shrink-0 overflow-hidden rounded-md bg-ivory-dark md:block">
              <Image src={mediaUrl(cover.path)} alt="" fill sizes="48px" className="object-cover object-top" />
            </div>
          ) : null}
          <div className="min-w-0 flex-1">
            <p className="truncate text-ink">{name}</p>
            <p className="text-sm text-mute md:hidden">
              {[color ? pick(color, 'name', locale) : '', selected ? `${t.product.size} ${selected.label}` : '', price].filter(Boolean).join(' · ')}
            </p>
          </div>
          <p className="hidden whitespace-nowrap text-lg font-medium text-ink md:block">{price}</p>
          <button type="button" onClick={addToBag} disabled={soldOut} className={`${secondaryButton} hidden h-11 md:inline-flex`}>
            {selected ? t.product.addToCart : t.product.chooseOptions}
          </button>
          <button type="button" onClick={goToForm} disabled={soldOut} className={`${primaryButton} h-11`}>
            {t.product.order}
          </button>
        </div>
      </div>
    </>
  )
}

function Gallery({ product, images, badge }: { product: Product; images: ProductImage[]; badge: string | null }) {
  const { locale } = useStore()
  const t = dictionaryFor(locale)
  const [active, setActive] = useState(0)
  const [zoom, setZoom] = useState<number | null>(null)
  const [show3d, setShow3d] = useState(false)
  const closeModel = useCallback(() => setShow3d(false), [])
  const strip = useRef<HTMLDivElement>(null)
  const { lens, handlers } = useLens()

  // Keep the thumbnails in sync when the visitor swipes.
  function onScroll() {
    const el = strip.current
    if (!el) return
    const i = Math.round(Math.abs(el.scrollLeft) / el.clientWidth)
    if (i !== active) setActive(i)
  }

  function show(index: number) {
    const i = (index + images.length) % images.length
    setActive(i)
    const el = strip.current
    if (el) el.scrollTo({ left: (document.dir === 'rtl' ? -1 : 1) * i * el.clientWidth, behavior: 'smooth' })
  }

  if (images.length === 0) return <div className="aspect-[3/4] rounded-[20px] bg-ivory-dark" />

  const arrow =
    'absolute top-1/2 hidden size-11 -translate-y-1/2 place-items-center rounded-full bg-ivory-light/90 text-ink shadow-md transition-opacity hover:bg-ivory-light md:grid md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100'

  return (
    // The thumbnails sit under the photo, and beside it on wide screens so
    // the whole gallery stays in view while the order form scrolls.
    <div className="min-w-0 md:sticky md:top-28 md:self-start lg:grid lg:grid-cols-[84px_1fr] lg:gap-3">
      <div className="group relative overflow-hidden rounded-[20px] border border-line bg-ivory-dark lg:col-start-2">
        <div
          ref={strip}
          onScroll={onScroll}
          className="flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {images.map((img, i) => (
            <button
              key={img.id}
              type="button"
              onClick={() => setZoom(i)}
              aria-label={`${t.product.zoom} — ${t.product.photo(i + 1, images.length)}`}
              className="relative aspect-[3/4] w-full shrink-0 snap-center cursor-zoom-in overflow-hidden bg-ivory-dark"
              {...(i === active ? handlers : {})}
            >
              <Image
                src={mediaUrl(img.path)}
                alt={pick(img, 'alt', locale)}
                fill
                preload={i === 0}
                sizes="(min-width: 768px) 50vw, 100vw"
                quality={90}
                className="object-cover"
              />
              {lens && i === active ? <Lens src={mediaUrl(img.path)} lens={lens} /> : null}
            </button>
          ))}
        </div>

        {badge ? (
          <span className="pointer-events-none absolute start-4 top-4 rounded-full bg-burgundy px-3.5 py-1.5 text-[0.625rem] font-bold uppercase tracking-[0.14em] text-ivory shadow-[0_6px_14px_-4px_rgba(77,19,28,0.5)] rtl:text-xs rtl:tracking-normal">
            {badge}
          </span>
        ) : null}

        {images.length > 1 ? (
          <>
            <button type="button" onClick={() => show(active - 1)} aria-label={t.product.previous} className={`${arrow} start-4`}>
              <ChevronIcon className="size-5 rotate-180 rtl:rotate-0" />
            </button>
            <button type="button" onClick={() => show(active + 1)} aria-label={t.product.next} className={`${arrow} end-4`}>
              <ChevronIcon className="size-5 rtl:rotate-180" />
            </button>
          </>
        ) : null}

        {product.model_3d_path ? (
          <button
            type="button"
            onClick={() => setShow3d(true)}
            className="absolute bottom-4 start-4 flex items-center gap-2 rounded-full bg-ivory-light/90 px-4 py-2 text-sm text-ink shadow-md hover:bg-ivory-light"
          >
            <CubeIcon className="size-4" />
            {t.viewer.open}
          </button>
        ) : null}
      </div>

      {images.length > 1 ? (
        <div className="mt-3 grid grid-cols-4 gap-2.5 lg:col-start-1 lg:row-start-1 lg:mt-0 lg:flex lg:flex-col">
          {images.map((img, i) => (
            <button
              key={img.id}
              type="button"
              onClick={() => show(i)}
              aria-label={t.product.photo(i + 1, images.length)}
              aria-current={i === active}
              className={`relative aspect-[3/4] overflow-hidden rounded-[10px] border-2 bg-ivory-dark transition-[border-color,box-shadow,translate] duration-300 ease-luxe ${
                i === active ? 'border-burgundy shadow-[0_0_0_4px_rgba(77,19,28,0.1)]' : 'border-transparent hover:-translate-y-0.5 hover:border-line'
              }`}
            >
              <Image src={mediaUrl(img.path)} alt="" fill sizes="(min-width: 1024px) 84px, 25vw" className="object-cover object-top" />
            </button>
          ))}
        </div>
      ) : null}

      {zoom !== null ? (
        <ZoomViewer
          images={images.map((img) => ({ src: mediaUrl(img.path), alt: pick(img, 'alt', locale) }))}
          index={zoom}
          onIndexChange={setZoom}
          onClose={() => setZoom(null)}
          labels={{ close: t.product.close, photo: t.product.photo }}
        />
      ) : null}

      {show3d && product.model_3d_path ? (
        <ModelDialog url={mediaUrl(product.model_3d_path)} label={pick(product, 'name', locale)} onClose={closeModel} />
      ) : null}
    </div>
  )
}

// Full-screen 3D view of the coat, when a model has been uploaded in the admin.
function ModelDialog({ url, label, onClose }: { url: string; label: string; onClose: () => void }) {
  const { locale } = useStore()
  const t = dictionaryFor(locale)

  useEffect(() => {
    lockScroll(true)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => {
      lockScroll(false)
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  return (
    <div role="dialog" aria-modal="true" aria-label={label} className="fixed inset-0 z-[80] flex flex-col bg-burgundy-deep text-ivory">
      <div className="flex justify-end p-3">
        <button type="button" onClick={onClose} autoFocus className="flex items-center gap-2 p-2 text-sm text-ivory/80 hover:text-ivory">
          <CloseIcon className="size-5" />
          {t.product.close}
        </button>
      </div>
      <div className="min-h-0 flex-1">
        <ModelViewer url={url} label={label} />
      </div>
      <p className="p-5 text-center text-sm text-ivory/55">{t.viewer.hint}</p>
    </div>
  )
}

// Sand panel under the photos: the description on one side, the details as a
// card of characteristics on the other ("Matière : Tweed" splits in two).
function Description({ product }: { product: Product }) {
  const { locale } = useStore()
  const t = dictionaryFor(locale)
  const text = lines(pick(product, 'description', locale))
  const specs = lines(pick(product, 'details', locale))
  if (text.length + specs.length === 0) return null
  const [lead, accent] = t.product.descriptionTitle

  return (
    <section id="description" className="mt-14 rounded-3xl bg-ivory px-5 py-10 md:mt-20 md:p-14">
      <Eyebrow>{t.product.descriptionEyebrow}</Eyebrow>
      <h2 className="mt-3.5 font-display text-[1.875rem] font-medium leading-[1.1] text-ink md:text-[2.5rem] rtl:leading-[1.4]">
        {lead} <em className="text-gold rtl:not-italic">{accent}</em>
      </h2>
      <div className="mt-7 grid items-start gap-8 md:grid-cols-2 md:gap-14">
        {text.length ? (
          <div className="space-y-4 text-[0.9375rem] leading-[1.8] text-mute">
            {text.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </div>
        ) : null}
        {specs.length ? (
          <ul className="rounded-2xl border border-line bg-white p-5 md:p-7">
            <li className={`${label} border-b border-line pb-3.5`}>{t.product.specs}</li>
            {specs.map((line) => {
              const cut = line.indexOf(' : ')
              return (
                <li key={line} className="flex justify-between gap-4 border-b border-line/60 py-2.5 text-sm last:border-b-0 last:pb-0">
                  {cut > 0 ? (
                    <>
                      <span className="text-mute">{line.slice(0, cut)}</span>
                      <span className="text-end font-semibold text-ink">{line.slice(cut + 3)}</span>
                    </>
                  ) : (
                    <span className="flex gap-3 text-ink">
                      <span className="mt-2 size-1 shrink-0 rotate-45 bg-gold" />
                      {line}
                    </span>
                  )}
                </li>
              )
            })}
          </ul>
        ) : null}
      </div>
    </section>
  )
}

function Accordions({ product }: { product: Product }) {
  const { locale } = useStore()
  const t = dictionaryFor(locale)
  const guide = lines(pick(product, 'size_guide', locale))
  const items = [
    guide.length
      ? {
          id: 'guide',
          title: t.product.sizeGuide,
          body: (
            <div className="space-y-1.5">
              {guide.map((l) => (
                <p key={l}>{l}</p>
              ))}
            </div>
          ),
        }
      : null,
    { id: 'livraison', title: t.product.delivery, body: <p>{t.product.deliveryText}</p> },
  ].filter((x) => x !== null)

  return (
    <div className="mt-8 border-t border-line">
      {items.map((item) => (
        <details key={item.id} id={item.id} className="group border-b border-line">
          <summary className="flex cursor-pointer list-none items-center justify-between py-4 text-[0.875rem] font-medium uppercase tracking-[0.12em] text-ink rtl:text-base rtl:tracking-normal [&::-webkit-details-marker]:hidden">
            {item.title}
            <span className="relative size-3">
              <span className="absolute inset-x-0 top-1/2 h-px bg-current" />
              <span className="absolute inset-y-0 start-1/2 w-px bg-current transition-transform duration-300 group-open:rotate-90 group-open:opacity-0" />
            </span>
          </summary>
          <div className="pb-5 text-[0.95rem] leading-relaxed text-mute">{item.body}</div>
        </details>
      ))}
    </div>
  )
}
