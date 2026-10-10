import Link from 'next/link'
import type { Locale } from '@/lib/i18n/config'
import { dictionaryFor } from '@/lib/i18n/dictionaries'

export function LegalPage({
  locale,
  title,
  sections,
}: {
  locale: Locale
  title: string
  sections: { heading: string; body: string[] }[]
}) {
  const t = dictionaryFor(locale)
  return (
    <main className="bg-ivory-light">
      <article className="mx-auto max-w-2xl px-5 py-16">
        <h1 className="font-display text-4xl text-burgundy md:text-5xl">{title}</h1>
        {sections.map((s) => (
          <section key={s.heading} className="mt-10">
            <h2 className="font-display text-2xl text-ink">{s.heading}</h2>
            {s.body.map((p) => (
              <p key={p} className="mt-3 leading-relaxed text-mute">
                {p}
              </p>
            ))}
          </section>
        ))}
        <p className="mt-16">
          <Link href={`/${locale}`} className="text-sm text-burgundy underline decoration-gold underline-offset-4">
            {t.thanks.back}
          </Link>
        </p>
      </article>
    </main>
  )
}
