'use client'

import { dictionaryFor } from '@/lib/i18n/dictionaries'
import type { Locale } from '@/lib/i18n/config'
import { whatsappLink } from '@/lib/format'
import { track } from '@/lib/tracking/client'
import { WhatsAppIcon } from './icons'

// Thin bar above the header of every shop page: one tap opens WhatsApp with a
// message already written. Hidden until a WhatsApp number is set in the admin.
export function ContactBar({ locale, number }: { locale: Locale; number: string }) {
  if (!number) return null
  const t = dictionaryFor(locale).contactBar
  return (
    <a
      href={whatsappLink(number, t.message)}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => track('Contact')}
      className="flex h-9 items-center justify-center gap-2 bg-burgundy-deep px-4 text-[0.75rem] text-ivory/85 transition-colors hover:bg-[#45101a] hover:text-ivory md:text-[0.8125rem]"
    >
      <WhatsAppIcon className="size-4 shrink-0 text-[#4fce8a]" />
      <span className="truncate md:hidden">{t.short}</span>
      <span className="hidden truncate md:inline">{t.long}</span>
      <span aria-hidden className="text-ivory/50 rtl:rotate-180">→</span>
    </a>
  )
}

// Round WhatsApp button in the bottom corner on computers. Phones have the
// WhatsApp tab in the bottom bar instead.
export function WhatsAppButton({ locale, number }: { locale: Locale; number: string }) {
  if (!number) return null
  const t = dictionaryFor(locale).contactBar
  return (
    <a
      href={whatsappLink(number, t.message)}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => track('Contact')}
      aria-label={t.button}
      title={t.button}
      className="wa-float fixed bottom-8 end-8 z-30 hidden size-14 place-items-center rounded-full bg-[#25d366] text-white shadow-[0_10px_30px_rgba(0,0,0,0.25)] transition-[transform,bottom] duration-300 hover:scale-105 md:grid"
    >
      <span aria-hidden className="absolute inset-0 animate-ping rounded-full bg-[#25d366] opacity-30 [animation-iteration-count:3]" />
      <WhatsAppIcon className="relative size-7" />
    </a>
  )
}
