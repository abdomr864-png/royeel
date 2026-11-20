import { CITIES } from './cities'
import type { Locale } from './i18n/config'

// 1500 -> "1 500 DH" (fr) / "1 500 درهم" (ar), Western digits in both, which is
// what Moroccan shoppers read on price tags. The group separator is a
// no-break space so right-to-left text keeps "1 500" together as one number.
const NBSP = String.fromCharCode(0xa0)

export function formatPrice(amount: number, locale: Locale) {
  const n = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(amount).replace(/\s/g, NBSP)
  return locale === 'ar' ? `${n}${NBSP}درهم` : `${n}${NBSP}DH`
}

export function formatDateTime(iso: string, locale: Locale = 'fr') {
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-MA' : 'fr-MA', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Africa/Casablanca',
    numberingSystem: 'latn',
  }).format(new Date(iso))
}

export function orderRef(orderNumber: number) {
  return `RY-${orderNumber}`
}

// Accepts 06…, 6…, 2126…, +2126…, 00212… with spaces/dashes; returns +2126XXXXXXXX or null.
export function normalizeMoroccanPhone(input: string): string | null {
  let digits = input.replace(/[\s().-]/g, '')
  if (digits.startsWith('+')) digits = digits.slice(1)
  if (digits.startsWith('00')) digits = digits.slice(2)
  if (!/^\d+$/.test(digits)) return null
  if (digits.startsWith('212')) digits = digits.slice(3)
  if (digits.startsWith('0')) digits = digits.slice(1)
  if (!/^[5-7]\d{8}$/.test(digits)) return null
  return `+212${digits}`
}

// "+212612345678" -> "06 12 34 56 78"
export function displayPhone(e164: string) {
  const local = e164.replace(/^\+212/, '0')
  return local.replace(/^(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/, '$1 $2 $3 $4 $5')
}

export function whatsappLink(number: string, text?: string) {
  const n = number.replace(/\D/g, '')
  return `https://wa.me/${n}${text ? `?text=${encodeURIComponent(text)}` : ''}`
}

// The Ozon Express place a customer typed, spelled as Ozon spells it, or null
// when Ozon does not deliver there. Ignores case, accents, dashes, Arabic
// glosses and a "ville" suffix (Ozon writes "KENITRA VILLE", "Tinghir ville").
export function matchCity(input: string): string | null {
  const key = cityKey(input)
  if (!key) return null
  const alias = CITY_ALIASES[key]
  if (alias) return alias
  return CITIES.find((c) => cityKey(c) === key) ?? CITIES.find((c) => bareKey(c) === bareKey(input)) ?? null
}

// Usual spellings of places Ozon writes differently.
const CITY_ALIASES: Record<string, string> = {
  ifrane: 'IFRAN',
  settat: 'Settate',
  ouarzazate: 'Ouarzazat',
  'el hajeb': 'ElHajeb VILLE',
  'fquih ben salah': 'fquih ben saleh',
  'kelaa sraghna': 'Kelâa des Sraghna',
  'kalaat sraghna': 'Kelâa des Sraghna',
  'oued zem': 'Oued zem',
  'ben guerir': 'Ben Guerir',
  benguerir: 'Ben Guerir',
  'm diq': 'M Diq',
  mdiq: 'M Diq',
  hoceima: 'Al Hoceima',
  'el hoceima': 'Al Hoceima',
  laayoune: 'Laayoune-ville',
  smara: 'Essemara-السمارة',
  'es semara': 'Essemara-السمارة',
  inezgane: 'Inzegane',
  'tan tan': 'TANTAN',
  'sidi slimane': 'SIDI SLIMAN',
}

function cityKey(name: string) {
  return name
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/\p{Script=Arabic}/gu, ' ')
    .toLowerCase()
    .replace(/[\s\-–—_:()/’']+/g, ' ')
    .trim()
}

function bareKey(name: string) {
  return cityKey(name).replace(/^ville | ville$/g, '')
}
