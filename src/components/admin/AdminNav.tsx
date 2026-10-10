'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { Swan, Wordmark } from '@/components/brand/Logo'
import { signOut } from '@/lib/admin/actions'

const LINKS = [
  { href: '/admin', label: 'Tableau de bord', icon: 'M4 13h6V4H4zM14 20h6V11h-6zM4 20h6v-3H4zM14 7h6V4h-6z' },
  { href: '/admin/commandes', label: 'Commandes', icon: 'M6 4h12l1 4H5zM5 8h14v12H5zM9 12h6' },
  { href: '/admin/produits', label: 'Produits', icon: 'M8 4l4 2 4-2 4 4-3 3v9H7v-9L4 8z' },
  { href: '/admin/clients', label: 'Clients', icon: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 20a8 8 0 0 1 16 0' },
  { href: '/admin/reglages', label: 'Réglages', icon: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19 12l2-1-1-3-2 .3-1.3-1.5.3-2-3-1-1 2h-2l-1-2-3 1 .3 2L5.8 8.3 4 8 3 11l2 1v0l-2 1 1 3 2-.3 1.3 1.5-.3 2 3 1 1-2h2l1 2 3-1-.3-2 1.5-1.3 2 .3 1-3z' },
]

export function AdminNav({ email }: { email: string }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const isActive = (href: string) => (href === '/admin' ? pathname === '/admin' : pathname.startsWith(href))

  const nav = (
    <nav className="flex flex-col gap-1">
      {LINKS.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          onClick={() => setOpen(false)}
          className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
            isActive(l.href) ? 'bg-ivory/12 text-ivory' : 'text-ivory/65 hover:bg-ivory/5 hover:text-ivory'
          }`}
        >
          <svg viewBox="0 0 24 24" className="size-[18px]" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round">
            <path d={l.icon} />
          </svg>
          {l.label}
        </Link>
      ))}
    </nav>
  )

  const footer = (
    <div className="mt-auto grid gap-2 border-t border-ivory/10 pt-4 text-xs text-ivory/50">
      <a href="/" target="_blank" className="flex items-center gap-2 hover:text-ivory">
        Voir la boutique ↗
      </a>
      <span className="truncate">{email}</span>
      <form action={signOut}>
        <button type="submit" className="hover:text-ivory">
          Se déconnecter
        </button>
      </form>
    </div>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-svh flex-col bg-burgundy px-4 py-6 md:flex">
        <Link href="/admin" className="mb-8 flex items-center gap-3 px-2 text-ivory">
          <Swan className="w-9" />
          <Wordmark className="w-24" />
        </Link>
        {nav}
        {footer}
      </aside>

      {/* Phone top bar + drawer */}
      <header className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between bg-burgundy px-4 text-ivory md:hidden">
        <Link href="/admin" className="flex items-center gap-2">
          <Swan className="w-7" />
          <Wordmark className="w-20" />
        </Link>
        <button type="button" onClick={() => setOpen(true)} aria-label="Menu" className="grid size-10 place-items-center">
          <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>
      </header>
      <div className={`fixed inset-0 z-50 md:hidden ${open ? '' : 'pointer-events-none'}`}>
        <div onClick={() => setOpen(false)} className={`absolute inset-0 bg-ink/50 transition-opacity ${open ? 'opacity-100' : 'opacity-0'}`} />
        <div
          className={`absolute inset-y-0 end-0 flex w-72 flex-col bg-burgundy px-4 py-6 transition-transform duration-300 ${
            open ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <button type="button" onClick={() => setOpen(false)} aria-label="Fermer" className="mb-6 self-end text-2xl text-ivory/70">
            ×
          </button>
          {nav}
          {footer}
        </div>
      </div>
    </>
  )
}
