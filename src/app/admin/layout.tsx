import type { Metadata, Viewport } from 'next'
import '../globals.css'
import { fontVariables } from '@/lib/fonts'

export const metadata: Metadata = {
  title: { default: 'Admin', template: '%s · Admin Royeel' },
  robots: { index: false, follow: false },
  icons: { icon: '/brand/icon.svg' },
}

export const viewport: Viewport = { themeColor: '#4d131c' }

// Admin pages read the session on every request; they are never prerendered.
export const instant = false

export default function AdminRootLayout({ children }: LayoutProps<'/admin'>) {
  return (
    <html lang="fr" dir="ltr" className={fontVariables}>
      <body className="min-h-svh bg-[#f6f2ec] text-ink antialiased">{children}</body>
    </html>
  )
}
