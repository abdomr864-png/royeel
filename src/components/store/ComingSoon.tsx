import Image from 'next/image'
import type { Dictionary } from '@/lib/i18n/get-dictionary'
import type { PublicSettings } from '@/lib/types'
import { whatsappLink } from '@/lib/format'
import { FullLogo } from '@/components/brand/Logo'
import { InstagramIcon, WhatsAppIcon } from './icons'

// Replaces the whole shop while "Bientôt disponible" is on in the admin:
// the link shared on Instagram then shows a teaser instead of the collection.
export function ComingSoon({ t, settings }: { t: Dictionary; settings: PublicSettings }) {
  const s = t.soon
  const external = { target: '_blank', rel: 'noopener noreferrer' }
  return (
    <main className="relative isolate flex min-h-svh flex-col overflow-hidden bg-burgundy text-ivory">
      {/* Soft gold glow behind the photo. */}
      <div aria-hidden className="absolute -top-40 start-1/2 -z-10 size-[44rem] -translate-x-1/2 rounded-full bg-burgundy-soft/45 blur-3xl rtl:translate-x-1/2 lg:start-1/4" />

      <header className="flex items-center justify-between px-5 pt-5 md:px-10 md:pt-8">
        <span className="text-[0.6875rem] uppercase tracking-[0.3em] text-gold-light/80 rtl:text-xs rtl:tracking-normal">{s.made}</span>
        <a href={s.otherLanguage.href} className="rounded-full border border-ivory/25 px-4 py-1.5 text-[0.8125rem] text-ivory/85 transition-colors hover:border-gold hover:text-ivory">
          {s.otherLanguage.label}
        </a>
      </header>

      <div className="mx-auto grid w-full max-w-[1180px] flex-1 items-center gap-7 px-5 py-6 md:gap-10 md:px-10 md:py-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16 lg:py-16">
        <div className="relative mx-auto w-[min(44vw,190px)] animate-[fade_1.4s_var(--ease-luxe)_both] lg:w-[min(32vw,400px)]">
          <div className="relative aspect-[3/4] overflow-hidden rounded-t-full border border-gold/50 p-2">
            <div className="relative size-full overflow-hidden rounded-t-full">
              <Image src="/brand/hero/swan-newspaper.jpg" alt={s.photo} fill preload sizes="(min-width: 1024px) 400px, 190px" className="object-cover" />
            </div>
          </div>
          <Sparkle className="absolute -top-2 -end-5 size-6 text-gold-light lg:size-8" />
          <Sparkle className="absolute bottom-12 -start-6 size-4 text-gold lg:size-5" />
          <Sparkle className="absolute -bottom-3 end-8 size-3 text-ivory/70" />
        </div>

        <div className="text-center lg:text-start">
          <FullLogo className="mx-auto w-[min(34vw,140px)] text-ivory lg:mx-0 lg:w-[200px]" />

          <p className="mt-6 flex items-center justify-center gap-3 lg:mt-9 text-[0.6875rem] font-medium uppercase tracking-[0.32em] text-gold-light lg:justify-start rtl:text-sm rtl:tracking-normal">
            <span aria-hidden className="h-px w-8 bg-gold/60" />
            {s.eyebrow}
            <span aria-hidden className="h-px w-8 bg-gold/60 lg:hidden" />
          </p>
          <h1 className="mt-4 font-display text-[2.375rem] font-medium leading-[1.02] md:text-[3.5rem] xl:text-[4rem] rtl:leading-[1.35]">
            {s.title[0]}
            <br />
            <em className="text-gold-light rtl:not-italic">{s.title[1]}</em>
            <span aria-hidden className="inline-flex gap-1 ps-1 text-gold-light">
              <Dot delay="0s" />
              <Dot delay="0.25s" />
              <Dot delay="0.5s" />
            </span>
          </h1>
          <p className="mx-auto mt-4 max-w-[440px] text-[0.9375rem] leading-relaxed text-ivory/75 lg:mx-0 rtl:text-base">{s.sub}</p>

          <div className="mt-7 flex flex-col items-center gap-3 sm:flex-row lg:mt-9 sm:justify-center lg:justify-start">
            {settings.instagram_url ? (
              <a
                href={settings.instagram_url}
                {...external}
                className="inline-flex h-[3.25rem] w-full max-w-[300px] items-center justify-center gap-2.5 rounded-full bg-ivory px-7 text-[0.8125rem] font-semibold uppercase tracking-[0.1em] whitespace-nowrap text-burgundy shadow-[0_10px_30px_-10px_rgba(0,0,0,0.6)] transition-colors hover:bg-gold-light sm:w-auto rtl:text-base rtl:tracking-normal"
              >
                <InstagramIcon className="size-5" />
                {s.instagram}
              </a>
            ) : null}
            {settings.whatsapp_number ? (
              <a
                href={whatsappLink(settings.whatsapp_number, s.whatsappMessage)}
                {...external}
                className="inline-flex h-[3.25rem] w-full max-w-[300px] items-center justify-center gap-2.5 rounded-full border border-ivory/35 px-7 text-[0.8125rem] font-medium uppercase tracking-[0.1em] whitespace-nowrap text-ivory transition-colors hover:border-gold-light hover:text-gold-light sm:w-auto rtl:text-base rtl:tracking-normal"
              >
                <WhatsAppIcon className="size-5" />
                {s.whatsapp}
              </a>
            ) : null}
          </div>
        </div>
      </div>

      <footer dir="ltr" className="px-5 pb-6 text-center text-[0.75rem] text-ivory/45">Royeel · Uniquely yours.</footer>
    </main>
  )
}

function Dot({ delay }: { delay: string }) {
  return <span className="inline-block size-[0.14em] animate-pulse rounded-full bg-current align-baseline" style={{ animationDelay: delay }} />
}

function Sparkle({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M12 0c.6 6.4 5.6 11.4 12 12-6.4.6-11.4 5.6-12 12-.6-6.4-5.6-11.4-12-12C6.4 11.4 11.4 6.4 12 0z" />
    </svg>
  )
}
