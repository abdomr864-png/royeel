'use client'

import Image from 'next/image'
import Link from 'next/link'
import { dictionaryFor } from '@/lib/i18n/dictionaries'
import { formatPrice, whatsappLink } from '@/lib/format'
import { pick } from '@/lib/localize'
import { orderedImages, productPath } from '@/lib/product'
import { mediaUrl } from '@/lib/supabase/env'
import { Drawer } from './Drawer'
import { HomeIcon, WhatsAppIcon } from './icons'
import { LanguageLink } from './LanguageLink'
import { useStore } from './StoreContext'

export function MenuDrawer() {
  const { locale, products, settings, panel, closePanel } = useStore()
  const t = dictionaryFor(locale)
  const socials = [
    { label: 'Instagram', href: settings.instagram_url },
    { label: 'TikTok', href: settings.tiktok_url },
    { label: 'Facebook', href: settings.facebook_url },
  ].filter((s) => s.href)

  const row = 'flex items-center gap-4 border-b border-line px-5 py-4 text-ink transition-colors hover:bg-ivory'

  return (
    <Drawer open={panel === 'menu'} side="start" title={t.nav.menu} closeLabel={t.nav.close} onClose={closePanel}>
      <nav className="flex flex-col">
        <Link href={`/${locale}`} onClick={closePanel} className={row}>
          <span className="grid size-14 place-items-center rounded-full border border-line text-burgundy">
            <HomeIcon className="size-5" />
          </span>
          {t.nav.home}
        </Link>
        {products.map((product) => {
          const cover = orderedImages(product)[0]
          return (
            <Link key={product.id} href={productPath(locale, product)} prefetch onClick={closePanel} className={row}>
              <span className="relative size-14 shrink-0 overflow-hidden rounded-full bg-ivory-dark">
                {cover ? <Image src={mediaUrl(cover.path)} alt="" fill sizes="56px" className="object-cover object-top" /> : null}
              </span>
              <span>
                <span className="block">{pick(product, 'name', locale)}</span>
                <span className="block text-sm text-mute">{formatPrice(product.price_mad, locale)}</span>
              </span>
            </Link>
          )
        })}
      </nav>

      <div className="px-5 pt-8">
        <p className="eyebrow text-gold">{t.nav.help}</p>
        <ul className="mt-3 grid gap-3 text-[0.9375rem] text-ink">
          <li>
            <Link href={`/${locale}/echanges`} onClick={closePanel} className="hover:text-burgundy">
              {t.footer.legal.exchanges}
            </Link>
          </li>
          <li>
            <Link href={`/${locale}/conditions`} onClick={closePanel} className="hover:text-burgundy">
              {t.footer.legal.conditions}
            </Link>
          </li>
          <li>
            <Link href={`/${locale}/confidentialite`} onClick={closePanel} className="hover:text-burgundy">
              {t.footer.legal.privacy}
            </Link>
          </li>
          {settings.whatsapp_number ? (
            <li>
              <a
                href={whatsappLink(settings.whatsapp_number, t.contactBar.message)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 hover:text-burgundy"
              >
                <WhatsAppIcon className="size-4 text-[#1f9d55]" />
                {t.contactBar.button}
              </a>
            </li>
          ) : null}
        </ul>
      </div>

      <div className="mt-auto flex items-center justify-between gap-4 border-t border-line px-5 py-5 text-sm">
        <LanguageLink locale={locale} className="rounded-[5px] border border-line px-4 py-2 text-ink hover:border-burgundy" />
        <div className="flex gap-4 text-mute">
          {socials.map((s) => (
            <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" className="hover:text-burgundy">
              {s.label}
            </a>
          ))}
        </div>
      </div>
    </Drawer>
  )
}
