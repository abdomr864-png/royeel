import type { Metadata, Viewport } from 'next'
import { draftMode } from 'next/headers'
import { connection } from 'next/server'
import { Suspense } from 'react'
import Link from 'next/link'
import '../globals.css'
import { fontVariables } from '@/lib/fonts'
import { dirOf, locales } from '@/lib/i18n/config'
import { getDictionary, getLocale } from '@/lib/i18n/get-dictionary'
import { getStorefront } from '@/lib/catalog'
import { CartDrawer } from '@/components/store/CartDrawer'
import { ComingSoon } from '@/components/store/ComingSoon'
import { ContactBar, WhatsAppButton } from '@/components/store/ContactBar'
import { Header } from '@/components/store/Header'
import { MenuDrawer } from '@/components/store/MenuDrawer'
import { MobileNav } from '@/components/store/MobileNav'
import { Pixels } from '@/components/store/Pixels'
import { Footer, Marquee } from '@/components/store/Sections'
import { StoreProvider } from '@/components/store/StoreContext'

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }))
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale()
  const t = await getDictionary()
  const { settings } = await getStorefront()
  // The link preview on Instagram and WhatsApp follows the page shown.
  const { title, description } = settings.coming_soon
    ? { title: t.soon.metaTitle, description: t.soon.metaDescription }
    : t.meta
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: title, template: '%s · Royeel' },
    description,
    alternates: { canonical: `/${locale}`, languages: { fr: '/fr', ar: '/ar' } },
    openGraph: {
      type: 'website',
      siteName: 'Royeel',
      locale: locale === 'ar' ? 'ar_MA' : 'fr_MA',
      title,
      description,
      images: [{ url: '/brand/og.png', width: 1200, height: 630, alt: 'Royeel' }],
    },
    icons: { icon: [{ url: '/brand/favicon-48.png', sizes: '48x48' }, { url: '/brand/icon.png', sizes: '512x512' }], apple: '/brand/apple-icon.png' },
  }
}

export const viewport: Viewport = {
  themeColor: '#5b0b18',
  width: 'device-width',
  initialScale: 1,
}

export default async function StoreLayout({ children }: LayoutProps<'/[locale]'>) {
  const locale = await getLocale()
  const t = await getDictionary()
  const { products, settings, demo } = await getStorefront()
  // While the shop is closed, the admin still sees it in preview (draft mode,
  // turned on from the settings page).
  const preview = settings.coming_soon && (await draftMode()).isEnabled
  if (settings.coming_soon && !preview) {
    return (
      <html lang={locale} dir={dirOf(locale)} className={fontVariables}>
        <body className="bg-burgundy">
          <ComingSoon t={t} settings={settings} />
          <Suspense>
            <RequestTime />
          </Suspense>
          <Pixels metaPixelId={settings.meta_pixel_id} tiktokPixelId={settings.tiktok_pixel_id} />
        </body>
      </html>
    )
  }
  return (
    <html lang={locale} dir={dirOf(locale)} className={fontVariables}>
      <body>
        <StoreProvider locale={locale} products={products} settings={settings} demo={demo}>
          {preview ? (
            <p dir="ltr" className="bg-ink px-4 py-2 text-center text-xs leading-snug text-ivory">
              Aperçu admin : les visiteurs voient la page « Bientôt disponible ».{' '}
              <Link href="/admin/apercu?fin=1" prefetch={false} className="font-semibold text-gold-light underline underline-offset-2">
                Quitter l’aperçu
              </Link>
            </p>
          ) : null}
          {demo ? <p className="bg-ink px-4 py-1.5 text-center text-[11px] leading-snug text-ivory">{t.demoBanner}</p> : null}
          <Marquee t={t} />
          <ContactBar locale={locale} number={settings.whatsapp_number} />
          <Header />
          {children}
          <Footer t={t} locale={locale} settings={settings} />
          <MobileNav />
          <MenuDrawer />
          <CartDrawer />
        </StoreProvider>
        <WhatsAppButton locale={locale} number={settings.whatsapp_number} />
        <Pixels metaPixelId={settings.meta_pixel_id} tiktokPixelId={settings.tiktok_pixel_id} />
      </body>
    </html>
  )
}

// The teaser page replaces the pages, so it drops their request-time parts.
// Pages whose metadata reads the URL (a product, an order) still need one to
// prerender: this empty part waits for the request.
async function RequestTime() {
  await connection()
  return null
}
