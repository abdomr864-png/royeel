import Link from 'next/link'
import { Flourish, Wordmark } from '@/components/brand/Logo'
import { dictionaryFor } from '@/lib/i18n/dictionaries'
import { getLocale } from '@/lib/i18n/get-dictionary'

export default async function NotFound() {
  const locale = await getLocale()
  const t = dictionaryFor(locale)
  return (
    <main className="grid min-h-[60svh] place-items-center px-6 py-20 text-center">
      <div className="flex flex-col items-center">
        <Wordmark className="h-16 text-burgundy" />
        <Flourish className="mt-1 h-3 text-gold" />
        <h1 className="mt-8 font-display text-3xl text-ink">{t.notFound.title}</h1>
        <Link href={`/${locale}`} className="mt-6 text-sm text-burgundy underline decoration-gold underline-offset-4">
          {t.notFound.back}
        </Link>
      </div>
    </main>
  )
}
