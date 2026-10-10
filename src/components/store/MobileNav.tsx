'use client'

import Link from 'next/link'
import { dictionaryFor } from '@/lib/i18n/dictionaries'
import { whatsappLink } from '@/lib/format'
import { track } from '@/lib/tracking/client'
import { BagIcon, HomeIcon, MenuIcon, WhatsAppIcon } from './icons'
import { useStore } from './StoreContext'

// Bottom tab bar on phones: menu, home, cart and WhatsApp within thumb reach.
export function MobileNav() {
  const { locale, settings, cartCount, openPanel } = useStore()
  const t = dictionaryFor(locale)
  const item = 'flex flex-1 flex-col items-center justify-center gap-1 text-[11px] text-ink'

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex h-[calc(4rem+env(safe-area-inset-bottom))] rounded-t-2xl border-x border-t border-line bg-ivory-light px-2 pb-[env(safe-area-inset-bottom)] shadow-[0_-6px_20px_rgba(42,20,24,0.06)] md:hidden">
      <button type="button" onClick={() => openPanel('menu')} className={item}>
        <MenuIcon className="size-6" />
        {t.nav.menu}
      </button>
      <Link href={`/${locale}`} className={item}>
        <HomeIcon className="size-6" />
        {t.nav.home}
      </Link>
      <button type="button" onClick={() => openPanel('cart')} className={item}>
        <span className="relative">
          <BagIcon className="size-6" />
          <span className="absolute -end-2 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-burgundy px-1 text-[10px] leading-none text-ivory">
            {cartCount}
          </span>
        </span>
        {t.nav.cart}
      </button>
      {settings.whatsapp_number ? (
        <a
          href={whatsappLink(settings.whatsapp_number, t.contactBar.message)}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => track('Contact')}
          className={item}
        >
          <WhatsAppIcon className="size-6 text-[#1f9d55]" />
          WhatsApp
        </a>
      ) : null}
    </nav>
  )
}
