import { notFound } from 'next/navigation'
import { locale as rootLocale } from 'next/root-params'
import { isLocale, type Locale } from './config'
import { dictionaryFor } from './dictionaries'

export type { Dictionary } from './dictionaries'

// Current locale from the [locale] root segment.
export async function getLocale(): Promise<Locale> {
  const value = await rootLocale()
  if (!isLocale(value)) notFound()
  return value
}

export async function getDictionary() {
  return dictionaryFor(await getLocale())
}
