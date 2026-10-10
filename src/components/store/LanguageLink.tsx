'use client'

import { LOCALE_COOKIE, type Locale } from '@/lib/i18n/config'
import { dictionaryFor } from '@/lib/i18n/dictionaries'

// Opens the same page in the other language; the choice is remembered in a
// cookie. The page is only known on click (reading it while rendering would
// stop pages from being built ahead of time), so without JavaScript the link
// falls back to the other language's home page.
export function LanguageLink({ locale, className }: { locale: Locale; className?: string }) {
  const t = dictionaryFor(locale)
  const other: Locale = locale === 'fr' ? 'ar' : 'fr'
  return (
    <a
      href={`/${other}`}
      hrefLang={other}
      lang={other}
      aria-label={t.nav.switchToLabel}
      onClick={(e) => {
        document.cookie = `${LOCALE_COOKIE}=${other}; path=/; max-age=31536000; SameSite=Lax`
        const { pathname, search } = window.location
        e.preventDefault()
        window.location.assign(pathname.replace(new RegExp(`^/${locale}(?=/|$)`), `/${other}`) + search)
      }}
      className={className}
    >
      {t.nav.switchTo}
    </a>
  )
}
