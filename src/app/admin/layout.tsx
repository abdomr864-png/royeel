import type { Metadata, Viewport } from 'next'
import '../globals.css'
import { fontVariables } from '@/lib/fonts'

export const metadata: Metadata = {
  title: { default: 'Admin', template: '%s · Admin Royeel' },
  robots: { index: false, follow: false },
  icons: { icon: [{ url: '/brand/favicon-48.png', sizes: '48x48' }, { url: '/brand/icon.png', sizes: '512x512' }] },
}

export const viewport: Viewport = { themeColor: '#5b0b18' }

// Admin pages read the session on every request; they are never prerendered.
export const instant = false

export default function AdminRootLayout({ children }: LayoutProps<'/admin'>) {
  return (
    <html lang="fr" dir="ltr" className={fontVariables}>
      <body className="min-h-svh bg-[#f6f2ec] text-ink antialiased">{children}</body>
    </html>
  )
}
