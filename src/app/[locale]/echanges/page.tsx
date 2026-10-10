import type { Metadata } from 'next'
import { LegalPage } from '@/components/store/LegalPage'
import { getLocale } from '@/lib/i18n/get-dictionary'
import { legalDoc } from '@/lib/legal'

export async function generateMetadata(): Promise<Metadata> {
  return { title: legalDoc('exchanges', await getLocale()).title }
}

export default async function Page() {
  const locale = await getLocale()
  const doc = legalDoc('exchanges', locale)
  return <LegalPage locale={locale} title={doc.title} sections={doc.sections} />
}
