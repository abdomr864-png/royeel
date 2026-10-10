import type { Metadata, Viewport } from 'next'
import '../globals.css'
import { fontVariables } from '@/lib/fonts'
import { dirOf, locales } from '@/lib/i18n/config'
import { getDictionary, getLocale } from '@/lib/i18n/get-dictionary'
import { getStorefront } from '@/lib/catalog'
import { CartDrawer } from '@/components/store/CartDrawer'
import { ContactBar, WhatsAppButton } from '@/components/store/ContactBar'
import { Header } from '@/components/store/Header'
import { MenuDrawer } from '@/components/store/MenuDrawer'
import { MobileNav } from '@/components/store/MobileNav'
import { Pixels } from '@/components/store/Pixels'
import { Footer } from '@/components/store/Sections'
import { StoreProvider } from '@/components/store/StoreContext'

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }))
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale()
  const t = await getDictionary()
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: t.meta.title, template: '%s · Royeel' },
    description: t.meta.description,
    alternates: { canonical: `/${locale}`, languages: { fr: '/fr', ar: '/ar' } },
    openGraph: {
      type: 'website',
      siteName: 'Royeel',
      locale: locale === 'ar' ? 'ar_MA' : 'fr_MA',
      title: t.meta.title,
      description: t.meta.description,
      images: [{ url: '/brand/og.png', width: 1200, height: 630, alt: 'Royeel' }],
    },
    icons: { icon: '/brand/icon.svg', apple: '/brand/apple-icon.png' },
  }
}

export const viewport: Viewport = {
  themeColor: '#4d131c',
  width: 'device-width',
  initialScale: 1,
}

export default async function StoreLayout({ children }: LayoutProps<'/[locale]'>) {
  const locale = await getLocale()
  const t = await getDictionary()
  const { products, settings, demo } = await getStorefront()
  return (
    <html lang={locale} dir={dirOf(locale)} className={fontVariables}>
      <body>
        <StoreProvider locale={locale} products={products} settings={settings} demo={demo}>
          {demo ? <p className="bg-ink px-4 py-1.5 text-center text-[11px] leading-snug text-ivory">{t.demoBanner}</p> : null}
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
