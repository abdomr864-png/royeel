'use client'

import dynamic from 'next/dynamic'
import Image from 'next/image'
import { useCallback, useEffect, useRef, useState } from 'react'
import { dictionaryFor } from '@/lib/i18n/dictionaries'
import { formatPrice, whatsappLink } from '@/lib/format'
import { lines, pick } from '@/lib/localize'
import { colorsOf, defaultColor, imagesFor, isSoldOut, sizesFor } from '@/lib/product'
import { mediaUrl } from '@/lib/supabase/env'
import { track } from '@/lib/tracking/client'
import type { Product, ProductImage } from '@/lib/types'
import { ChevronIcon, CloseIcon, CubeIcon, PerkIcon, WhatsAppIcon } from './icons'
import { QuantityStepper } from './QuantityStepper'
import { lockScroll, scrollToId } from './scroll'
import { MAX_PER_SIZE, maxQuantity, useStore } from './StoreContext'
import { primaryButton, secondaryButton } from './ui'
import { Lens, useLens, ZoomViewer } from './ZoomViewer'

const ModelViewer = dynamic(() => import('./ModelViewer'), { ssr: false })

const LOW_STOCK = 3

// Product page: photos on one side; name, price, colours, sizes and the two
// buy buttons on the other. A bar with the buttons follows once they scroll away.
export function ProductView({ product }: { product: Product }) {
  const { locale, settings, addToCart, openPanel, openCheckout } = useStore()
  const t = dictionaryFor(locale)
  const colors = colorsOf(product)
  const [colorId, setColorId] = useState<string | null>(() => defaultColor(product)?.id ?? null)
  const color = colors.find((c) => c.id === colorId) ?? null
  const [sizeId, setSizeId] = useState<string | null>(null)
  const [quantity, setQuantity] = useState(1)
  // Bumped when someone tries to buy without a size, to shake the size picker.
  const [nudge, setNudge] = useState(0)
  const buttons = useRef<HTMLDivElement>(null)
  const [barVisible, setBarVisible] = useState(false)

  const sizes = sizesFor(product, colorId)
  const selected = sizes.find((s) => s.id === sizeId && s.stock > 0)
  // The whole product, or just the picked colour, has nothing left.
  const soldOut = isSoldOut(product) || sizes.every((s) => s.stock <= 0)
  const name = pick(product, 'name', locale)
  const price = formatPrice(product.price_mad, locale)
  const images = imagesFor(product, colorId)
  const cover = images[0]
  const guide = pick(product, 'size_guide', locale)
  const shake = nudge > 0 && !selected

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

  function add(then: 'cart' | 'checkout') {
    if (!selected) return askForSize()
    addToCart(selected.id, quantity)
    setQuantity(1)
    if (then === 'cart') openPanel('cart')
    else openCheckout()
  }

  function openGuide() {
    const el = document.getElementById('guide')
    if (el instanceof HTMLDetailsElement) el.open = true
    scrollToId('guide', 'center')
  }

  return (
    <>
      <section className="mx-auto grid max-w-[1440px] gap-7 pb-14 md:grid-cols-2 md:gap-10 md:px-[18px] md:pb-20 md:pt-10 lg:gap-14">
        {/* A new colour starts its photos from the first one. */}
        <Gallery key={colorId ?? 'all'} product={product} images={images} />

        <div className="px-4 md:px-0">
          <div className="flex items-start justify-between gap-4">
            <h1 className="text-[2rem] font-medium leading-[1.1] text-ink md:text-[2.75rem]">{name}</h1>
            <p className="whitespace-nowrap pt-1.5 text-xl font-medium text-ink md:pt-3 md:text-2xl">{price}</p>
          </div>
          {pick(product, 'subtitle', locale) ? <p className="mt-2 text-mute">{pick(product, 'subtitle', locale)}</p> : null}

          <p className="mt-5 text-[0.9375rem]">
            <span className="font-medium text-ink">{t.product.category} :</span> <span className="text-mute">{t.product.categoryName}</span>
          </p>
          {pick(product, 'description', locale) ? (
            <p className="mt-4 max-w-prose leading-relaxed text-mute">{pick(product, 'description', locale)}</p>
          ) : null}

          {colors.length ? (
            <div className="mt-8 flex items-start gap-4">
              <span id="color-label" className="w-20 shrink-0 pt-2.5 font-medium text-ink">
                {t.product.color} :
              </span>
              <div className="min-w-0 flex-1">
                <div role="radiogroup" aria-labelledby="color-label" className="flex flex-wrap gap-2">
                  {colors.map((c) => {
                    const on = c.id === colorId
                    const out = sizesFor(product, c.id).every((s) => s.stock <= 0)
                    return (
                      <button
                        key={c.id}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        aria-label={pick(c, 'name', locale)}
                        title={pick(c, 'name', locale)}
                        onClick={() => {
                          setColorId(c.id)
                          setSizeId(null)
                        }}
                        className={`relative block size-11 border-2 p-[3px] transition-colors ${on ? 'border-burgundy' : 'border-line hover:border-burgundy/50'}`}
                      >
                        <span className={`block size-full ${out ? 'opacity-40' : ''}`} style={{ background: c.hex }} />
                        {out ? <span aria-hidden className="absolute inset-0 m-auto h-px w-[80%] -rotate-45 bg-mute" /> : null}
                      </button>
                    )
                  })}
                </div>
                {color ? <p className="mt-2 text-sm text-ink">{pick(color, 'name', locale)}</p> : null}
              </div>
            </div>
          ) : null}

          <div id="taille" className="mt-5 flex items-start gap-4">
            <span id="size-label" className={`w-20 shrink-0 pt-2.5 font-medium ${shake ? 'text-burgundy' : 'text-ink'}`}>
              {t.product.size} :
            </span>
            <div className="min-w-0 flex-1">
              <div
                key={nudge}
                role="radiogroup"
                aria-labelledby="size-label"
                className={`flex flex-wrap gap-2 ${shake ? 'animate-[shake_0.5s_ease-in-out]' : ''}`}
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
                      className={`relative h-11 min-w-12 border px-3 text-sm transition-colors ${
                        out
                          ? 'cursor-not-allowed border-line text-mute/50'
                          : on
                            ? 'border-burgundy bg-burgundy text-ivory'
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
              {selected && selected.stock <= LOW_STOCK ? (
                <p className="mt-2 flex items-center gap-2 text-sm text-burgundy">
                  <span className="size-1.5 animate-pulse rounded-full bg-burgundy" />
                  {t.product.lastPieces(selected.stock)}
                </p>
              ) : null}
              {guide ? (
                <button type="button" onClick={openGuide} className="mt-3 text-sm text-ink underline decoration-gold underline-offset-4">
                  {t.product.sizeGuide}
                </button>
              ) : null}
            </div>
          </div>

          <div ref={buttons} className="mt-8 grid grid-cols-[auto_1fr] gap-2.5 md:flex">
            <QuantityStepper
              value={quantity}
              max={selected ? maxQuantity(selected) : MAX_PER_SIZE}
              onChange={setQuantity}
              label={t.product.quantity}
            />
            <button type="button" onClick={() => add('cart')} disabled={soldOut} className={`${secondaryButton} h-12 md:flex-1`}>
              {t.product.addToCart}
            </button>
            <button type="button" onClick={() => add('checkout')} disabled={soldOut} className={`${primaryButton} col-span-2 h-12 md:flex-1`}>
              {soldOut ? t.product.outOfStock : t.product.buyNow}
            </button>
          </div>

          <ul className="mt-8 grid grid-cols-3 gap-3 border-t border-line pt-7 text-center md:flex md:flex-col md:gap-4 md:text-start">
            {(['exchange', 'delivery', 'cod'] as const).map((key) => (
              <li key={key} className="flex flex-col items-center gap-2 md:flex-row md:gap-4">
                <PerkIcon name={key} className="size-9 shrink-0 text-burgundy md:size-10" />
                <span className="text-[0.75rem] uppercase leading-snug tracking-[0.06em] text-ink md:text-[1.0625rem] rtl:text-sm rtl:tracking-normal md:rtl:text-lg">
                  {t.perks[key].title}
                </span>
              </li>
            ))}
          </ul>

          {settings.whatsapp_number ? (
            <a
              href={whatsappLink(settings.whatsapp_number, t.contactBar.message)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => track('Contact')}
              aria-label={`${t.product.customerService} — WhatsApp`}
              title={`${t.product.customerService} — WhatsApp`}
              className="mt-7 grid size-12 place-items-center rounded-full bg-[#25d366] text-white shadow-[0_6px_18px_rgba(37,211,102,0.35)] transition-transform hover:scale-105"
            >
              <WhatsAppIcon className="size-6" />
            </a>
          ) : null}

          <Accordions product={product} />
        </div>
      </section>

      <div
        inert={!barVisible}
        className={`fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 border-t border-line bg-ivory-light/95 backdrop-blur transition-transform duration-300 ease-luxe md:bottom-0 ${
          barVisible ? 'translate-y-0' : 'translate-y-[calc(100%+5rem)]'
        }`}
      >
        <div className="mx-auto flex max-w-[1440px] items-center gap-3 px-4 py-2.5 md:gap-5 md:px-[18px] md:py-3">
          {cover ? (
            <div className="relative hidden h-16 w-12 shrink-0 overflow-hidden bg-ivory-dark md:block">
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
          <button type="button" onClick={() => add('cart')} disabled={soldOut} className={`${secondaryButton} hidden h-11 md:inline-flex`}>
            {selected ? t.product.addToCart : t.product.chooseOptions}
          </button>
          <button type="button" onClick={() => add('checkout')} disabled={soldOut} className={`${primaryButton} h-11`}>
            {t.product.buyNow}
          </button>
        </div>
      </div>
    </>
  )
}

function Gallery({ product, images }: { product: Product; images: ProductImage[] }) {
  const { locale } = useStore()
  const t = dictionaryFor(locale)
  const [active, setActive] = useState(0)
  const [zoom, setZoom] = useState<number | null>(null)
  const [show3d, setShow3d] = useState(false)
  const closeModel = useCallback(() => setShow3d(false), [])
  const strip = useRef<HTMLDivElement>(null)
  const { lens, handlers } = useLens()

  // Keep the dots in sync when the visitor swipes.
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

  if (images.length === 0) return <div className="aspect-[3/4] bg-ivory-dark" />

  const arrow =
    'absolute top-1/2 hidden size-11 -translate-y-1/2 place-items-center rounded-full bg-ivory-light/90 text-ink shadow-md transition-opacity hover:bg-ivory-light md:grid md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100'

  return (
    <div className="min-w-0">
      <div className="group relative">
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
        <div className="mt-4 flex justify-center gap-2">
          {images.map((img, i) => (
            <button
              key={img.id}
              type="button"
              onClick={() => show(i)}
              aria-label={t.product.photo(i + 1, images.length)}
              aria-current={i === active}
              className={`size-2.5 rounded-full border border-ink/50 transition-colors ${i === active ? 'bg-ink' : 'hover:bg-ink/30'}`}
            />
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

function Accordions({ product }: { product: Product }) {
  const { locale } = useStore()
  const t = dictionaryFor(locale)
  const details = lines(pick(product, 'details', locale))
  const guide = lines(pick(product, 'size_guide', locale))
  const items = [
    details.length
      ? {
          id: 'details',
          title: t.product.details,
          body: (
            <ul className="space-y-2">
              {details.map((d) => (
                <li key={d} className="flex gap-3">
                  <span className="mt-2.5 size-1 shrink-0 rotate-45 bg-gold" />
                  {d}
                </li>
              ))}
            </ul>
          ),
        }
      : null,
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
