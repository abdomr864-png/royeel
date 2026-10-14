import Image from 'next/image'
import Link from 'next/link'
import { cacheLife } from 'next/cache'
import { Ornament, Swan, Tagline, Wordmark } from '@/components/brand/Logo'
import type { Dictionary } from '@/lib/i18n/dictionaries'
import type { Locale } from '@/lib/i18n/config'
import { whatsappLink } from '@/lib/format'
import type { PublicSettings } from '@/lib/types'
import { InstagramIcon, PerkIcon } from './icons'
import { Eyebrow } from './Showcase'

// Strip of sliding messages at the very top of the shop. The list is laid
// out twice so the loop has no seam.
export function Marquee({ t }: { t: Dictionary }) {
  // Repeated so one copy is wider than any screen.
  const items = [...t.marquee, ...t.marquee, ...t.marquee]
  return (
    <div className="overflow-hidden bg-burgundy text-ivory">
      <div className="marquee flex w-max">
        {[0, 1].map((copy) => (
          <ul key={copy} aria-hidden={copy === 1} className="flex shrink-0">
            {items.map((item, i) => (
              <li
                key={i}
                className="flex h-8 items-center gap-6 ps-6 text-[0.6875rem] font-medium uppercase tracking-[0.14em] rtl:text-[0.8125rem] rtl:tracking-normal"
              >
                {item}
                <span aria-hidden className="size-1 rotate-45 bg-gold-light" />
              </li>
            ))}
          </ul>
        ))}
      </div>
    </div>
  )
}

// Row of promises under the home banner: an icon beside two short lines each.
export function Perks({ t, whatsapp, bankTransfer }: { t: Dictionary; whatsapp: boolean; bankTransfer: boolean }) {
  const keys = whatsapp ? (['cod', 'delivery', 'exchange', 'made', 'advice'] as const) : (['cod', 'delivery', 'exchange', 'made'] as const)
  return (
    <section className="border-y border-line bg-ivory-light px-4 py-6 md:px-8 md:py-7">
      <ul className={`mx-auto grid max-w-[1280px] grid-cols-2 gap-y-5 md:grid-cols-3 ${keys.length === 5 ? 'lg:grid-cols-5' : 'lg:grid-cols-4'}`}>
        {keys.map((key) => (
          <li key={key} className="group flex items-center gap-3 px-2 md:px-4 lg:border-e lg:border-line lg:last:border-e-0">
            <PerkIcon name={key} className="size-9 shrink-0 text-burgundy transition-transform duration-300 ease-luxe group-hover:scale-110" />
            <div className="min-w-0">
              <p className="text-[0.8125rem] font-semibold leading-tight text-ink">{t.perks[key].title}</p>
              <p className="mt-0.5 text-[0.6875rem] leading-snug text-mute rtl:text-xs">
                {key === 'cod' && bankTransfer ? t.perks.cod.withTransfer : t.perks[key].text}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

// "Notre histoire": a brand photo beside the text, then three figures on a
// dark panel and a way back to the collection.
export function Story({ t, href }: { t: Dictionary; href: string }) {
  const s = t.home.story
  return (
    <section id="histoire" className="scroll-mt-24 bg-ivory-light px-4 py-16 md:px-8 md:py-24">
      <div className="mx-auto max-w-[1200px]">
        <header className="text-center">
          <Eyebrow center>{s.eyebrow}</Eyebrow>
          <h2 className="mt-4 font-display text-[2.25rem] leading-[1.1] text-ink md:text-[3.5rem] rtl:leading-[1.4]">
            {s.title[0]} <em className="text-gold rtl:not-italic">{s.title[1]}</em>
          </h2>
        </header>

        <div className="mt-10 grid items-center gap-9 md:mt-16 md:grid-cols-2 md:gap-14">
          <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-burgundy-deep">
            <Image src="/brand/hero/royeel-sheets.jpg" alt={s.photo} fill sizes="(min-width: 768px) 50vw, 92vw" className="object-cover" />
            <span className="absolute start-5 top-5 inline-flex items-center gap-2 rounded-full bg-ivory-light/95 px-3.5 py-2 text-[0.625rem] font-semibold uppercase tracking-[0.14em] text-ink rtl:text-xs rtl:tracking-normal">
              <span className="size-1.5 rounded-full bg-burgundy" />
              {s.tag}
            </span>
          </div>
          <div>
            <p className="eyebrow text-burgundy">— {s.chapter}</p>
            <h3 className="mt-4 font-display text-[1.875rem] font-medium leading-[1.15] text-ink md:text-[2.625rem] rtl:leading-[1.4]">
              {s.heading[0]} <em className="text-gold rtl:not-italic">{s.heading[1]}</em>
            </h3>
            <span className="mt-5 block h-0.5 w-10 rounded-full bg-burgundy" />
            <div className="mt-5 space-y-4 text-[0.9375rem] leading-[1.75] text-mute">
              {s.body.map((p) => (
                <p key={p}>{p}</p>
              ))}
            </div>
          </div>
        </div>

        <ul className="mt-12 grid rounded-[20px] bg-burgundy-deep px-5 py-6 text-center text-ivory md:mt-20 md:grid-cols-3 md:px-10 md:py-12">
          {s.stats.map((stat) => (
            <li key={stat.label} className="border-b border-ivory/10 px-4 py-6 last:border-b-0 md:border-b-0 md:border-e md:py-4 md:last:border-e-0">
              <p dir="ltr" className="font-display text-[3.25rem] font-medium leading-none md:text-[4.5rem]">
                {stat.number}
                <em className="text-gold-light">{stat.unit}</em>
              </p>
              <p className="mt-3 text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-ivory/70 rtl:text-sm rtl:tracking-normal">{stat.label}</p>
              <p className="mt-1.5 text-[0.8125rem] text-ivory/45">{stat.sub}</p>
            </li>
          ))}
        </ul>

        <p className="mt-10 text-center md:mt-14">
          <Link
            href={href}
            prefetch
            className="group inline-flex h-[3.25rem] items-center gap-2.5 rounded-full border border-burgundy px-8 text-[0.8125rem] font-semibold uppercase tracking-[0.12em] text-burgundy transition-colors hover:bg-burgundy hover:text-ivory rtl:text-base rtl:tracking-normal"
          >
            {s.cta}
            <span aria-hidden className="transition-transform duration-300 group-hover:translate-x-1 rtl:-scale-x-100 rtl:group-hover:-translate-x-1">
              →
            </span>
          </Link>
        </p>
      </div>
    </section>
  )
}

// Brand photos shown as Instagram tiles (public/brand/hero).
const INSTAGRAM_PHOTOS = [
  '/brand/hero/becoming-her.jpg',
  '/brand/hero/next-client.jpg',
  '/brand/hero/royeel-sheets.jpg',
  '/brand/hero/swan-newspaper.jpg',
]

// "Suivez @royeel.officiel": the brand photos as tiles, each opening the
// Instagram page set in the admin. Hidden until that address is set.
export function Instagram({ t, url }: { t: Dictionary; url: string }) {
  if (!url) return null
  const handle = `@${url.replace(/[?#].*$/, '').replace(/\/+$/, '').split('/').pop()}`
  const s = t.home.instagram
  const link = { href: url, target: '_blank', rel: 'noopener noreferrer' }
  return (
    <section className="bg-ivory px-4 py-16 md:px-8 md:py-24">
      <div className="mx-auto max-w-[1200px] text-center">
        <Eyebrow center>{s.eyebrow}</Eyebrow>
        <h2 className="mt-4 font-display text-[2.25rem] font-medium leading-[1.1] text-ink md:text-[3.125rem] rtl:leading-[1.4]">
          {s.title}{' '}
          <a {...link} dir="ltr" className="italic text-gold decoration-1 underline-offset-8 hover:underline">
            {handle}
          </a>
        </h2>
        <p className="mx-auto mt-3 max-w-[480px] text-[0.9375rem] leading-relaxed text-mute">{s.sub}</p>

        <ul className="mt-10 grid grid-cols-2 gap-2.5 md:mt-12 md:grid-cols-4 md:gap-4">
          {INSTAGRAM_PHOTOS.map((src, i) => (
            <li key={src}>
              <a {...link} aria-label={`${s.photos[i]} — Instagram`} className="group relative block aspect-[4/5] overflow-hidden rounded-2xl bg-ivory-dark">
                <Image
                  src={src}
                  alt={s.photos[i]}
                  fill
                  sizes="(min-width: 768px) 25vw, 50vw"
                  className="object-cover transition-transform duration-700 ease-luxe group-hover:scale-[1.06]"
                />
                <span className="absolute inset-0 grid place-items-center bg-burgundy-deep/55 opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100">
                  <InstagramIcon className="size-9 text-ivory" />
                </span>
              </a>
            </li>
          ))}
        </ul>

        <a
          {...link}
          className="mt-9 inline-flex h-[3.25rem] items-center gap-2.5 rounded-full bg-burgundy px-8 text-[0.8125rem] font-semibold uppercase tracking-[0.12em] text-ivory shadow-[0_8px_20px_-6px_rgba(77,19,28,0.55)] transition-colors hover:bg-burgundy-deep md:mt-12 rtl:text-base rtl:tracking-normal"
        >
          <InstagramIcon className="size-5" />
          {s.cta}
        </a>
      </div>
    </section>
  )
}

export function Faq({ t, locale }: { t: Dictionary; locale: Locale }) {
  return (
    <section className="bg-ivory-light px-5 py-24 md:px-10 md:py-32">
      <div className="mx-auto max-w-[760px]">
        <h2 className="text-center font-display text-[clamp(2rem,5vw,3.25rem)] font-light text-burgundy">{t.faq.heading}</h2>
        <Ornament className="mx-auto mt-5 w-36 text-gold" />
        <div className="mt-12 border-t border-line">
          {t.faq.items.map((item) => (
            <details key={item.q} className="group border-b border-line">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-6 font-display text-xl text-ink md:text-2xl [&::-webkit-details-marker]:hidden">
                {item.q}
                <span className="relative size-3 shrink-0 text-gold">
                  <span className="absolute inset-x-0 top-1/2 h-px bg-current" />
                  <span className="absolute inset-y-0 start-1/2 w-px bg-current transition-transform duration-300 group-open:rotate-90 group-open:opacity-0" />
                </span>
              </summary>
              <div className="pb-6 leading-relaxed text-mute">
                <p>{item.a}</p>
                {item.link ? (
                  <Link href={`/${locale}/${item.link.path}`} className="mt-3 inline-block text-sm text-burgundy underline decoration-gold underline-offset-4">
                    {item.link.label}
                  </Link>
                ) : null}
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}

async function currentYear() {
  'use cache'
  cacheLife('days')
  return new Date().getFullYear()
}

export async function Footer({ t, locale, settings }: { t: Dictionary; locale: Locale; settings: PublicSettings }) {
  const socials = [
    { label: 'Instagram', href: settings.instagram_url },
    { label: 'TikTok', href: settings.tiktok_url },
    { label: 'Facebook', href: settings.facebook_url },
  ].filter((s) => s.href)
  const year = await currentYear()
  return (
    <footer className="bg-burgundy-deep px-5 pb-28 pt-20 text-ivory md:px-10 md:pb-12">
      <div className="mx-auto flex max-w-[1200px] flex-col items-center text-center">
        <Swan className="w-20 text-ivory" />
        <Wordmark className="mt-5 w-48" title="Royeel" />
        <Ornament className="mt-3 w-32 text-gold-light/70" />
        <Tagline className="mt-3 w-36 text-ivory/70" />
        <p className="mt-6 max-w-xs text-sm text-ivory/55">{t.footer.about}</p>

        <nav className="mt-10 flex flex-wrap justify-center gap-x-8 gap-y-3 text-sm text-ivory/75">
          <Link href={`/${locale}/conditions`} className="hover:text-ivory">
            {t.footer.legal.conditions}
          </Link>
          <Link href={`/${locale}/echanges`} className="hover:text-ivory">
            {t.footer.legal.exchanges}
          </Link>
          <Link href={`/${locale}/confidentialite`} className="hover:text-ivory">
            {t.footer.legal.privacy}
          </Link>
          {settings.whatsapp_number ? (
            <a href={whatsappLink(settings.whatsapp_number)} target="_blank" rel="noopener noreferrer" className="hover:text-ivory">
              {t.footer.contactWhatsapp}
            </a>
          ) : null}
          {socials.map((s) => (
            <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" className="hover:text-ivory">
              {s.label}
            </a>
          ))}
        </nav>
        <p className="mt-12 text-xs text-ivory/35">{t.footer.rights(year)}</p>
      </div>
    </footer>
  )
}
