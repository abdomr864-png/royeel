import { CITIES, CITIES_AR } from '@/lib/cities'
import type { Locale } from '@/lib/i18n/config'

// Suggestions for the city field: every place Sendit delivers to, in Arabic on
// the Arabic site when Sendit has the name. matchCity reads both spellings.
export function CityOptions({ id, locale }: { id: string; locale: Locale }) {
  return (
    <datalist id={id}>
      {CITIES.map((city) => {
        const value = locale === 'ar' ? (CITIES_AR[city] ?? city) : city
        return <option key={city} value={value} />
      })}
    </datalist>
  )
}
