import type { Locale } from './i18n/config'

// pick(product, 'name', 'ar') -> product.name_ar, falling back to French when empty.
export function pick(obj: object, field: string, locale: Locale): string {
  const record = obj as Record<string, unknown>
  const value = record[`${field}_${locale}`]
  if (typeof value === 'string' && value.trim()) return value
  const fallback = record[`${field}_fr`]
  return typeof fallback === 'string' ? fallback : ''
}

export function lines(text: string) {
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
}
