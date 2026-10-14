'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import { dictionaryFor } from '@/lib/i18n/dictionaries'
import { formatPrice } from '@/lib/format'
import { pick } from '@/lib/localize'
import { isSoldOut, orderedImages, productPath } from '@/lib/product'
import { mediaUrl } from '@/lib/supabase/env'
import { useStore } from './StoreContext'
import { primaryButton } from './ui'

// Most cards under the banner.
const MAX_CARDS = 4

// Home banner: the featured piece in words on one side and in a large photo
// on the other, with a row of cards under them. The cards switch the piece
// shown, or its photo when the shop has a single piece.
export function HomeHero() {
  const { locale, products, settings } = useStore()
  const t = dictionaryFor(locale)
  const [index, setIndex] = useState(0)
  const [photo, setPhoto] = useState(0)

  const featured = products.slice(0, MAX_CARDS)
  const product = featured[index] ?? featured[0]
  if (!product) return null

  const single = featured.length === 1
  const images = orderedImages(product)
  const image = images[single ? photo : 0] ?? images[0]
  const name = pick(product, 'name', locale)
  const subtitle = pick(product, 'subtitle', locale)
  const href = productPath(locale, product)
  const cards = single
    ? images.slice(0, MAX_CARDS).map((img, i) => ({
        key: img.id,
        path: img.path,
        on: i === photo,
        pick: () => setPhoto(i),
        name: pick(img, 'alt', locale) || t.product.photo(i + 1, images.length),
        price: null,
      }))
    : featured.map((p, i) => ({
        key: p.id,
        path: orderedImages(p)[0]?.path,
        on: i === index,
        pick: () => setIndex(i),
        name: pick(p, 'name', locale),
        price: isSoldOut(p) ? t.product.outOfStock : formatPrice(p.price_mad, locale),
      }))

  const stat = 'font-display text-[1.625rem] font-semibold leading-none text-ink'
  const statLabel = 'mt-1.5 text-[0.6875rem] uppercase tracking-[0.09em] text-mute rtl:text-xs rtl:tracking-normal'

  return (
    <section className="overflow-hidden bg-ivory-light">
      <div className="mx-auto grid max-w-[1440px] gap-8 px-4 pt-10 md:grid-cols-2 md:gap-10 md:px-12 md:pt-0">
        <div className="flex flex-col justify-center md:py-14">
          <p className="eyebrow text-burgundy">{`${t.home.heroEyebrow} · ${t.product.categoryName}`}</p>
          <h1 className="mt-5 font-display text-[2.5rem] font-semibold leading-[1.05] text-ink md:text-[3.25rem] rtl:leading-[1.3]">
            <span className="block">
              Royeel <span className="font-normal text-gold">·</span> {name}
            </span>
            {subtitle ? <span className="mt-1 block text-[0.7em] font-light text-mute">{subtitle}</span> : null}
          </h1>
          <p className="mt-5 line-clamp-3 max-w-[480px] leading-relaxed text-mute">{pick(product, 'description', locale)}</p>

          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
            <Link href={href} prefetch className={`${primaryButton} h-[3.25rem] rounded-full px-8 uppercase tracking-[0.1em] rtl:tracking-normal`}>
              {t.home.heroCta}
            </Link>
            <a href="#histoire" className="group inline-flex items-center gap-2 text-[0.9375rem] font-medium text-ink">
              <span className="underline decoration-gold underline-offset-4">{t.home.heroMore}</span>
              <span aria-hidden className="transition-transform duration-300 group-hover:translate-x-1 rtl:-scale-x-100 rtl:group-hover:-translate-x-1">
                →
              </span>
            </a>
          </div>

          <dl className="mt-10 flex flex-wrap gap-x-9 gap-y-5 border-t border-line pt-6">
            <div>
              <dd className={stat}>{formatPrice(product.price_mad, locale)}</dd>
              <dt className="mt-2 inline-block rounded-full bg-burgundy px-3 py-1 text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-ivory rtl:text-xs rtl:tracking-normal">
                {t.home.heroEyebrow}
              </dt>
            </div>
            <div>
              <dd className={stat}>100%</dd>
              <dt className={statLabel}>{t.perks.made.title}</dt>
            </div>
            {settings.shipping_fee_mad === 0 ? (
              <div>
                <dd className={stat}>{t.checkout.free}</dd>
                <dt className={statLabel}>{t.checkout.shipping}</dt>
              </div>
            ) : null}
          </dl>
        </div>

        <div className="relative flex items-center justify-center md:min-h-[600px] md:py-10">
          <span
            aria-hidden
            className="pointer-events-none absolute end-0 top-10 hidden select-none whitespace-nowrap font-display text-[clamp(3.75rem,8vw,6.875rem)] font-bold uppercase leading-[0.8] text-burgundy/[0.07] md:block"
          >
            {name}
          </span>
          <span aria-hidden className="absolute left-1/2 top-1/2 size-[70%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-burgundy/15 blur-3xl" />
          <Link
            href={href}
            prefetch
            aria-label={name}
            className="relative block aspect-[4/5] w-full max-w-[440px] overflow-hidden rounded-3xl bg-ivory-dark shadow-[0_30px_50px_-20px_rgba(42,20,24,0.4)]"
          >
            {image ? (
              <Image
                key={image.id}
                src={mediaUrl(image.path)}
                alt={pick(image, 'alt', locale) || name}
                fill
                preload
                quality={90}
                sizes="(min-width: 768px) 440px, 92vw"
                className="animate-[fade_0.6s_ease-out] object-cover object-top"
              />
            ) : null}
          </Link>
        </div>
      </div>

      {cards.length > 1 ? (
        <div role="tablist" className="mx-auto grid max-w-[1440px] grid-cols-2 gap-2.5 px-4 pb-10 pt-8 md:grid-cols-4 md:gap-4 md:px-12 md:pb-12 md:pt-2">
          {cards.map((card) => (
            <button
              key={card.key}
              type="button"
              role="tab"
              aria-selected={card.on}
              onClick={card.pick}
              className={`flex items-center gap-3 rounded-2xl border p-2.5 text-start transition-[border-color,background-color,translate] duration-300 ease-luxe hover:-translate-y-0.5 ${
                card.on ? 'border-burgundy bg-white' : 'border-line bg-ivory hover:border-burgundy/50'
              }`}
            >
              <span className="relative size-14 shrink-0 overflow-hidden rounded-xl bg-ivory-dark md:size-16">
                {card.path ? <Image src={mediaUrl(card.path)} alt="" fill sizes="64px" className="object-cover object-top" /> : null}
              </span>
              <span className="min-w-0">
                <span className="block text-[0.625rem] font-semibold uppercase tracking-[0.1em] text-burgundy rtl:text-xs rtl:tracking-normal">
                  {t.home.discover} <span aria-hidden className="inline-block rtl:-scale-x-100">→</span>
                </span>
                <span className="mt-0.5 line-clamp-2 block text-[0.8125rem] font-medium leading-snug text-ink">{card.name}</span>
                {card.price ? <span className="block text-[0.8125rem] font-semibold text-ink">{card.price}</span> : null}
              </span>
            </button>
          ))}
        </div>
      ) : (
        <div className="pb-10 md:pb-4" />
      )}
    </section>
  )
}
