import Image from 'next/image'
import Link from 'next/link'
import { Swan } from '@/components/brand/Logo'
import type { Dictionary } from '@/lib/i18n/dictionaries'
import type { Locale } from '@/lib/i18n/config'
import { formatPrice } from '@/lib/format'
import { pick } from '@/lib/localize'
import { colorsOf, detailImages, isSoldOut, orderedImages, productPath } from '@/lib/product'
import { mediaUrl } from '@/lib/supabase/env'
import type { Product, ShowcasePiece } from '@/lib/types'
import { HeroSlides } from './HeroSlides'
import { secondaryButton } from './ui'

// "NOUVEAUTÉS" followed by the swan, as section titles across the shop.
export function SectionHeading({ children }: { children: string }) {
  return (
    <h2 className="flex items-center justify-center gap-3 text-center font-display text-[1.75rem] font-medium uppercase tracking-[0.06em] text-ink md:text-[2.125rem] rtl:tracking-normal">
      {children}
      <Swan className="h-7 w-auto text-burgundy md:h-9" />
    </h2>
  )
}

// Brand photos for the home banner (public/brand/hero).
const HERO_PHOTOS = [
  '/brand/hero/becoming-her.jpg',
  '/brand/hero/next-client.jpg',
  '/brand/hero/royeel-sheets.jpg',
  '/brand/hero/swan-newspaper.jpg',
]

// Full-width banner: the brand photos side by side on computers, taking turns
// on phones, with the call to action at the bottom so the words already in
// the photos stay readable.
export function HomeHero({ product, locale, t }: { product: Product; locale: Locale; t: Dictionary }) {
  return (
    // Pulled up under the header, which turns see-through over [data-hero]
    // (its height plus its 1px border).
    <section data-hero className="relative -mt-[65px] h-[86svh] min-h-[540px] overflow-hidden bg-burgundy-deep md:-mt-[89px] md:h-[min(100svh,880px)]">
      <HeroSlides photos={HERO_PHOTOS} alts={t.home.heroPhotos} />
      <div className="absolute inset-0 bg-gradient-to-b from-ink/50 via-transparent via-45% to-ink/75" />
      <div className="relative flex h-full flex-col items-center justify-end px-6 pb-12 text-center text-ivory md:pb-16">
        <h1 className="max-w-[18ch] font-display text-[2.25rem] font-medium leading-[1.05] md:max-w-none md:text-[3.5rem] rtl:leading-[1.35]">
          {t.home.heroTitle}
        </h1>
        <Link
          href={productPath(locale, product)}
          prefetch
          className="mt-8 inline-flex h-12 items-center rounded-[5px] bg-ivory px-9 text-[0.8125rem] font-medium uppercase tracking-[0.14em] text-burgundy transition-colors hover:bg-gold-light rtl:text-base rtl:tracking-normal"
        >
          {t.home.heroCta}
        </Link>
      </div>
    </section>
  )
}

// Image widths for a card shown alone (centred) or in the collection grid.
const CARD_SIZES = { single: '(min-width: 768px) 380px, 92vw', grid: '(min-width: 1024px) 20vw, (min-width: 768px) 33vw, 50vw' }

export function ProductCard({
  product,
  locale,
  t,
  layout = 'single',
}: {
  product: Product
  locale: Locale
  t: Dictionary
  layout?: keyof typeof CARD_SIZES
}) {
  const soldOut = isSoldOut(product)
  // A sold-out coat keeps one photo, under the veil.
  const [first, second] = soldOut ? orderedImages(product).slice(0, 1) : orderedImages(product)
  const name = pick(product, 'name', locale)
  const colors = colorsOf(product)
  return (
    <Link href={productPath(locale, product)} prefetch className="group block">
      <div className="relative aspect-[3/4] overflow-hidden bg-ivory-dark">
        {first ? (
          <Image
            src={mediaUrl(first.path)}
            alt={pick(first, 'alt', locale) || name}
            fill
            sizes={CARD_SIZES[layout]}
            className={`object-cover object-top transition-[opacity,scale] duration-700 ease-luxe group-hover:scale-[1.03] ${second ? 'group-hover:opacity-0' : ''}`}
          />
        ) : null}
        {second ? (
          <Image
            src={mediaUrl(second.path)}
            alt=""
            fill
            sizes={CARD_SIZES[layout]}
            className="object-cover opacity-0 transition-opacity duration-700 ease-luxe group-hover:opacity-100"
          />
        ) : null}
        {soldOut ? (
          <SoldOutVeil t={t} />
        ) : (
          <span className="absolute start-3 top-3 bg-gold px-2.5 py-1 text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-ivory rtl:text-xs rtl:tracking-normal">
            {t.product.new}
          </span>
        )}
      </div>
      <p className="mt-3.5 text-[1.0625rem] text-ink">{name}</p>
      <p className="text-sm text-mute">{t.product.categoryName}</p>
      <p className={`mt-1 font-medium ${soldOut ? 'text-mute' : 'text-ink'}`}>{formatPrice(product.price_mad, locale)}</p>
      {colors.length > 1 ? (
        <span className="mt-2 flex flex-wrap gap-1.5" aria-label={colors.map((c) => pick(c, 'name', locale)).join(', ')}>
          {colors.map((c) => (
            <span key={c.id} className="size-3.5 rounded-full border border-ink/15" style={{ background: c.hex }} />
          ))}
        </span>
      ) : null}
      {soldOut ? null : <span className={`${secondaryButton} mt-3 h-10 w-full`}>{t.product.chooseOptions}</span>}
    </Link>
  )
}

// Covers a sold-out photo, leaving it barely visible.
function SoldOutVeil({ t }: { t: Dictionary }) {
  return (
    <div className="absolute inset-0 grid place-items-center bg-black/80 p-3">
      <span className="border border-ivory/50 px-3 py-1.5 text-center text-[0.6875rem] font-medium uppercase tracking-[0.18em] text-ivory rtl:text-xs rtl:tracking-normal">
        {t.product.outOfStock}
      </span>
    </div>
  )
}

// A sold-out piece of the collection: the photo stays mostly hidden under the
// veil, and the card leads nowhere since it cannot be ordered.
export function ShowcaseCard({ piece, locale, t }: { piece: ShowcasePiece; locale: Locale; t: Dictionary }) {
  const name = pick(piece, 'name', locale)
  return (
    <div>
      <div className="relative aspect-[3/4] overflow-hidden bg-ivory-dark">
        <Image src={mediaUrl(piece.image_path)} alt={name} fill sizes={CARD_SIZES.grid} className="object-cover object-top" />
        <SoldOutVeil t={t} />
      </div>
      <p className="mt-3.5 text-[1.0625rem] text-ink">{name}</p>
      <p className="text-sm text-mute">{t.product.categoryName}</p>
      <p className="mt-1 font-medium text-mute">{formatPrice(piece.price_mad, locale)}</p>
    </div>
  )
}

// The close-up photos with their titles, each leading to the product page.
export function DetailsGrid({ product, locale, t }: { product: Product; locale: Locale; t: Dictionary }) {
  const details = detailImages(product)
  if (details.length === 0) return null
  return (
    <section className="mx-auto max-w-[1440px] px-4 py-16 md:px-[18px] md:py-24">
      <SectionHeading>{t.home.details}</SectionHeading>
      <ul className="mt-10 grid grid-cols-2 gap-x-4 gap-y-8 md:mt-14 md:grid-cols-4 md:gap-x-5">
        {details.map((img) => (
          <li key={img.id}>
            <Link href={productPath(locale, product)} prefetch className="group block">
              <div className="relative aspect-[3/4] overflow-hidden bg-ivory-dark">
                <Image
                  src={mediaUrl(img.path)}
                  alt={pick(img, 'alt', locale)}
                  fill
                  sizes="(min-width: 768px) 25vw, 50vw"
                  className="object-cover transition-transform duration-700 ease-luxe group-hover:scale-[1.04]"
                />
              </div>
              {pick(img, 'title', locale) ? <p className="mt-3 text-[1.0625rem] text-ink">{pick(img, 'title', locale)}</p> : null}
              {pick(img, 'caption', locale) ? <p className="mt-1 text-sm leading-relaxed text-mute">{pick(img, 'caption', locale)}</p> : null}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
