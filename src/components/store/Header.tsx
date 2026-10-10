'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Swan, Wordmark } from '@/components/brand/Logo'
import { dictionaryFor } from '@/lib/i18n/dictionaries'
import { BagIcon, MenuIcon, UserIcon } from './icons'
import { LanguageLink } from './LanguageLink'
import { useStore } from './StoreContext'

// While the page has a banner ([data-hero], home page only) and the visitor
// has not scrolled, the header turns see-through over it. Done in CSS so the
// first paint is already right.
const overBanner = {
  header: '[body:has([data-hero])_&]:border-transparent [body:has([data-hero])_&]:bg-transparent [body:has([data-hero])_&]:text-ivory',
  badge: '[body:has([data-hero])_&]:bg-ivory [body:has([data-hero])_&]:text-burgundy',
}

// Menu on one side, logo in the middle, the admin entrance and the cart on the other.
export function Header() {
  const { locale, cartCount, openPanel } = useStore()
  const t = dictionaryFor(locale)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={`sticky top-0 z-40 border-b border-line bg-ivory-light text-burgundy transition-colors duration-300 ${
        scrolled ? '' : overBanner.header
      }`}
    >
      <div className="grid h-16 grid-cols-[1fr_auto_1fr] items-center px-3 md:h-[88px] md:px-[18px]">
        <button
          type="button"
          onClick={() => openPanel('menu')}
          className="flex items-center gap-2 justify-self-start p-2 text-[0.9375rem]"
        >
          <MenuIcon className="size-6" />
          <span className="hidden md:inline">{t.nav.menu}</span>
          <span className="sr-only md:hidden">{t.nav.menu}</span>
        </button>

        <Link href={`/${locale}`} aria-label="Royeel" className="flex flex-col items-center">
          <Swan className="h-7 w-auto md:h-10" />
          <Wordmark className="mt-1 h-[11px] w-auto md:mt-1.5 md:h-[15px]" />
        </Link>

        <div className="flex items-center justify-self-end md:h-full">
          <LanguageLink locale={locale} className="hidden px-4 text-[0.9375rem] opacity-85 transition-opacity hover:opacity-100 md:block" />
          <span aria-hidden className="hidden h-full w-px bg-current opacity-20 md:block" />
          <Link href="/admin" prefetch={false} aria-label={t.nav.admin} title={t.nav.admin} className="p-2 opacity-70 transition-opacity hover:opacity-100 md:ms-3">
            <UserIcon className="size-[22px]" />
          </Link>
          <button
            type="button"
            onClick={() => openPanel('cart')}
            aria-label={t.nav.cartLabel(cartCount)}
            className="relative p-2 md:ms-1"
          >
            <BagIcon className="size-6" />
            <span
              className={`absolute end-0.5 top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-burgundy px-1 text-[10px] font-medium leading-none text-ivory ${
                scrolled ? '' : overBanner.badge
              }`}
            >
              {cartCount}
            </span>
          </button>
        </div>
      </div>
    </header>
  )
}
