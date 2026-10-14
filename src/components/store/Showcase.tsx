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

// "— DESCRIPTION DÉTAILLÉE": a short line then small caps, above titles
// (a line on both sides when centred).
export function Eyebrow({ children, center }: { children: string; center?: boolean }) {
  return (
    <p className={`flex items-center gap-3 text-burgundy ${center ? 'justify-center' : ''}`}>
      <span className="h-px w-7 bg-burgundy" />
      <span className="eyebrow">{children}</span>
      {center ? <span className="h-px w-7 bg-burgundy" /> : null}
    </p>
  )
}

// The last word of a title, in gold italics.
export function Accent({ text }: { text: string }) {
  const i = text.lastIndexOf(' ')
  if (i < 0) return text
  return (
    <>
      {text.slice(0, i)} <em className="text-gold rtl:not-italic">{text.slice(i + 1)}</em>
    </>
  )
}

// "LES DÉTAILS" followed by the swan, as a section title.
export function SectionHeading({ children }: { children: string }) {
  return (
    <h2 className="flex items-center justify-center gap-3 text-center font-display text-[1.75rem] font-medium uppercase tracking-[0.06em] text-ink md:text-[2.125rem] rtl:tracking-normal">
      {children}
      <Swan className="h-7 w-auto text-burgundy md:h-9" />
    </h2>
  )
}

const CARD_SIZES = '(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw'

const card = 'relative flex h-full flex-col overflow-hidden rounded-[18px] border border-line bg-white'
const cardKind = 'text-[0.625rem] font-semibold uppercase tracking-[0.14em] text-gold rtl:text-xs rtl:tracking-normal'
const cardName = 'mt-1 font-display text-[1.25rem] font-semibold leading-tight text-ink md:text-[1.375rem]'

// White card of the catalogue: photo, collection, name, colours, then the
// price facing a round arrow.
export function ProductCard({ product, locale, t }: { product: Product; locale: Locale; t: Dictionary }) {
  const soldOut = isSoldOut(product)
  // A sold-out coat keeps one photo, under the veil.
  const [first, second] = soldOut ? orderedImages(product).slice(0, 1) : orderedImages(product)
  const name = pick(product, 'name', locale)
  const colors = colorsOf(product)
  return (
    <Link
      href={productPath(locale, product)}
      prefetch
      className={`group ${card} transition-[translate,box-shadow] duration-300 ease-luxe hover:-translate-y-1 hover:shadow-[0_22px_44px_-22px_rgba(42,20,24,0.35)]`}
    >
      <div className="relative aspect-[3/4] overflow-hidden bg-ivory-dark">
        {first ? (
          <Image
            src={mediaUrl(first.path)}
            alt={pick(first, 'alt', locale) || name}
            fill
            sizes={CARD_SIZES}
            className={`object-cover object-top transition-[opacity,scale] duration-700 ease-luxe group-hover:scale-[1.05] ${second ? 'group-hover:opacity-0' : ''}`}
          />
        ) : null}
        {second ? (
          <Image
            src={mediaUrl(second.path)}
            alt=""
            fill
            sizes={CARD_SIZES}
            className="object-cover opacity-0 transition-opacity duration-700 ease-luxe group-hover:opacity-100"
          />
        ) : null}
        {soldOut ? (
          <SoldOutVeil t={t} />
        ) : (
          <span className="absolute start-3 top-3 rounded-full bg-burgundy px-2.5 py-1 text-[0.5625rem] font-bold uppercase tracking-[0.08em] text-ivory rtl:text-xs rtl:tracking-normal">
            {t.product.new}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-3.5 md:p-[18px]">
        <p className={cardKind}>{`${t.product.collection} · ${t.product.categoryName}`}</p>
        <h3 className={cardName}>
          <Accent text={name} />
        </h3>
        {colors.length > 1 ? (
          <span className="mt-2.5 flex flex-wrap gap-1.5" aria-label={colors.map((c) => pick(c, 'name', locale)).join(', ')}>
            {colors.map((c) => (
              <span key={c.id} className="size-4 rounded-full border-2 border-white shadow-[0_0_0_1px_var(--color-line)]" style={{ background: c.hex }} />
            ))}
          </span>
        ) : null}
        <div className="mt-auto flex items-center justify-between gap-2 pt-3">
          <p className={`text-[0.9375rem] font-semibold ${soldOut ? 'text-mute' : 'text-ink'}`}>{formatPrice(product.price_mad, locale)}</p>
          <span
            aria-hidden
            className="grid size-[34px] shrink-0 place-items-center rounded-full bg-burgundy text-ivory transition-transform duration-300 ease-luxe group-hover:translate-x-1 rtl:-scale-x-100 rtl:group-hover:-translate-x-1"
          >
            →
          </span>
        </div>
      </div>
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
    <div className={card}>
      <div className="relative aspect-[3/4] overflow-hidden bg-ivory-dark">
        <Image src={mediaUrl(piece.image_path)} alt={name} fill sizes={CARD_SIZES} className="object-cover object-top" />
        <SoldOutVeil t={t} />
      </div>
      <div className="flex flex-1 flex-col p-3.5 md:p-[18px]">
        <p className={cardKind}>{`${t.product.collection} · ${t.product.categoryName}`}</p>
        <h3 className={cardName}>
          <Accent text={name} />
        </h3>
        <p className="mt-auto pt-3 text-[0.9375rem] font-semibold text-mute">{formatPrice(piece.price_mad, locale)}</p>
      </div>
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
