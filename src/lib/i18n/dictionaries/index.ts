import type { Locale } from '../config'
import fr from './fr'
import ar from './ar'

export type { Dictionary } from './fr'

// Safe to import from Client Components: pass the locale, not the dictionary.
export function dictionaryFor(locale: Locale) {
  return locale === 'ar' ? ar : fr
}
