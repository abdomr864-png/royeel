'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import { CloseIcon } from './icons'

// Panel that slides in from the start (menu) or the end (cart) of the screen.
export function Drawer({
  open,
  side,
  title,
  closeLabel,
  onClose,
  children,
}: {
  open: boolean
  side: 'start' | 'end'
  title: string
  closeLabel: string
  onClose: () => void
  children: ReactNode
}) {
  const closeButton = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (open) closeButton.current?.focus({ preventScroll: true })
  }, [open])

  const hidden = side === 'start' ? '-translate-x-full rtl:translate-x-full' : 'translate-x-full rtl:-translate-x-full'

  return (
    // Visible at once when opening (so focus can move in), hidden only after
    // the slide-out when closing.
    <div className={`fixed inset-0 z-[60] ${open ? 'visible' : 'invisible transition-[visibility] delay-300'}`} inert={!open}>
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-ink/45 transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0'}`}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`absolute inset-y-0 flex w-[min(88vw,400px)] flex-col bg-ivory-light shadow-2xl transition-transform duration-300 ease-luxe ${
          side === 'start' ? 'start-0' : 'end-0'
        } ${open ? 'translate-x-0' : hidden}`}
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-line px-5">
          <p className="font-display text-xl uppercase tracking-[0.06em] text-ink rtl:tracking-normal">{title}</p>
          <button
            ref={closeButton}
            type="button"
            onClick={onClose}
            className="-me-2 flex items-center gap-1.5 p-2 text-sm text-mute transition-colors hover:text-burgundy"
          >
            <CloseIcon className="size-4" />
            {closeLabel}
          </button>
        </div>
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain">{children}</div>
      </div>
    </div>
  )
}
