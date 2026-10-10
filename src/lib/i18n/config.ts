export const locales = ['fr', 'ar'] as const
export type Locale = (typeof locales)[number]

export const defaultLocale: Locale = 'fr'
export const LOCALE_COOKIE = 'royeel_locale'

export function isLocale(value: string | undefined | null): value is Locale {
  return !!value && (locales as readonly string[]).includes(value)
}

export function dirOf(locale: Locale) {
  return locale === 'ar' ? 'rtl' : 'ltr'
}

// Picks the visitor's language from the Accept-Language header: Arabic when
// it is preferred over French, French otherwise.
export function localeFromAcceptLanguage(header: string | null): Locale {
  if (!header) return defaultLocale
  const ranked = header
    .split(',')
    .map((part) => {
      const [tag, q] = part.trim().split(';q=')
      return { lang: tag.toLowerCase().split('-')[0], q: q ? Number(q) : 1 }
    })
    .filter((x) => !Number.isNaN(x.q))
    .sort((a, b) => b.q - a.q)
  for (const { lang } of ranked) {
    if (isLocale(lang)) return lang
  }
  return defaultLocale
}
