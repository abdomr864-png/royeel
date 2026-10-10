import Link from 'next/link'
import { cacheLife } from 'next/cache'
import { Ornament, Swan, Tagline, Wordmark } from '@/components/brand/Logo'
import type { Dictionary } from '@/lib/i18n/dictionaries'
import type { Locale } from '@/lib/i18n/config'
import { whatsappLink } from '@/lib/format'
import type { PublicSettings } from '@/lib/types'
import { PerkIcon } from './icons'

// Row of boxed promises under the home banner.
export function Perks({ t, whatsapp, bankTransfer }: { t: Dictionary; whatsapp: boolean; bankTransfer: boolean }) {
  const keys = whatsapp ? (['delivery', 'cod', 'exchange', 'advice'] as const) : (['delivery', 'cod', 'exchange'] as const)
  return (
    <section className="border-b border-line">
      <ul className={`grid gap-px bg-line ${keys.length === 4 ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-3'}`}>
        {keys.map((key) => (
          <li key={key} className="flex flex-col items-center justify-center gap-3 bg-ivory-light px-3 py-7 text-center md:gap-4 md:py-10">
            <PerkIcon name={key} className="size-10 text-burgundy md:size-12" />
            <p className="font-display text-[1.0625rem] uppercase leading-tight tracking-[0.06em] text-ink md:text-[1.375rem] rtl:tracking-normal">
              {t.perks[key].title}
            </p>
            <p className="-mt-1 text-xs text-mute md:text-sm">{key === 'cod' && bankTransfer ? t.perks.cod.withTransfer : t.perks[key].text}</p>
          </li>
        ))}
      </ul>
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
