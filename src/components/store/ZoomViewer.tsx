'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { lockScroll } from './scroll'

export type ZoomImage = { src: string; alt: string }

const MAX_SCALE = 4
const TAP_SCALE = 2.5

type View = { scale: number; x: number; y: number }

// Full-screen photo viewer: pinch or double-tap to zoom into the fabric, drag
// to move around, swipe or use the arrows to change photo.
export function ZoomViewer({
  images,
  index,
  onIndexChange,
  onClose,
  labels,
}: {
  images: ZoomImage[]
  index: number
  onIndexChange: (i: number) => void
  onClose: () => void
  labels: { close: string; photo: (i: number, n: number) => string }
}) {
  const [view, setView] = useState<View>({ scale: 1, x: 0, y: 0 })
  const [interacting, setInteracting] = useState(false)
  const stage = useRef<HTMLDivElement>(null)
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const gesture = useRef<{ dist: number; scale: number; cx: number; cy: number; x: number; y: number } | null>(null)
  const drag = useRef<{ x: number; y: number; vx: number; vy: number; startX: number; moved: boolean } | null>(null)
  const lastTap = useRef(0)
  const closeBtn = useRef<HTMLButtonElement>(null)

  const go = useCallback(
    (delta: number) => {
      setView({ scale: 1, x: 0, y: 0 })
      onIndexChange((index + delta + images.length) % images.length)
    },
    [index, images.length, onIndexChange],
  )

  useEffect(() => {
    lockScroll(true)
    closeBtn.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') go(document.dir === 'rtl' ? -1 : 1)
      if (e.key === 'ArrowLeft') go(document.dir === 'rtl' ? 1 : -1)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      lockScroll(false)
      window.removeEventListener('keydown', onKey)
    }
  }, [go, onClose])

  // Keeps the zoomed image from being dragged off screen.
  const clamp = useCallback((v: View): View => {
    const el = stage.current
    if (!el || v.scale <= 1) return { scale: Math.max(1, v.scale), x: 0, y: 0 }
    const maxX = ((v.scale - 1) * el.clientWidth) / 2
    const maxY = ((v.scale - 1) * el.clientHeight) / 2
    return { scale: v.scale, x: Math.max(-maxX, Math.min(maxX, v.x)), y: Math.max(-maxY, Math.min(maxY, v.y)) }
  }, [])

  // Zoom so that the point under (px, py) stays in place.
  const zoomAt = useCallback(
    (px: number, py: number, nextScale: number, from: View) => {
      const el = stage.current!
      const r = el.getBoundingClientRect()
      const ox = px - r.left - r.width / 2
      const oy = py - r.top - r.height / 2
      const k = nextScale / from.scale
      return clamp({ scale: nextScale, x: ox - (ox - from.x) * k, y: oy - (oy - from.y) * k })
    },
    [clamp],
  )

  function onPointerDown(e: React.PointerEvent) {
    ;(e.target as Element).setPointerCapture?.(e.pointerId)
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    setInteracting(true)
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()]
      gesture.current = {
        dist: Math.hypot(a.x - b.x, a.y - b.y),
        scale: view.scale,
        cx: (a.x + b.x) / 2,
        cy: (a.y + b.y) / 2,
        x: view.x,
        y: view.y,
      }
      drag.current = null
    } else if (pointers.current.size === 1) {
      drag.current = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y, startX: e.clientX, moved: false }
    }
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!pointers.current.has(e.pointerId)) return
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (gesture.current && pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()]
      const dist = Math.hypot(a.x - b.x, a.y - b.y)
      const g = gesture.current
      const next = Math.min(MAX_SCALE, Math.max(1, (g.scale * dist) / g.dist))
      setView(zoomAt(g.cx, g.cy, next, { scale: g.scale, x: g.x, y: g.y }))
    } else if (drag.current) {
      const d = drag.current
      if (Math.abs(e.clientX - d.x) + Math.abs(e.clientY - d.y) > 6) d.moved = true
      if (view.scale > 1) setView(clamp({ scale: view.scale, x: d.vx + e.clientX - d.x, y: d.vy + e.clientY - d.y }))
    }
  }

  function onPointerUp(e: React.PointerEvent) {
    pointers.current.delete(e.pointerId)
    if (pointers.current.size < 2) gesture.current = null
    if (pointers.current.size === 0) setInteracting(false)
    const d = drag.current
    if (!d || pointers.current.size > 0) return
    drag.current = null
    if (view.scale === 1 && d.moved) {
      // Swipe to change photo.
      const dx = e.clientX - d.startX
      if (Math.abs(dx) > 50) go((dx < 0 ? 1 : -1) * (document.dir === 'rtl' ? -1 : 1))
      return
    }
    if (d.moved) return
    const now = Date.now()
    if (now - lastTap.current < 300 || e.pointerType === 'mouse') {
      lastTap.current = 0
      setView(view.scale > 1 ? { scale: 1, x: 0, y: 0 } : zoomAt(e.clientX, e.clientY, TAP_SCALE, view))
    } else {
      lastTap.current = now
    }
  }

  function onWheel(e: React.WheelEvent) {
    const next = Math.min(MAX_SCALE, Math.max(1, view.scale * (e.deltaY < 0 ? 1.15 : 1 / 1.15)))
    setView(zoomAt(e.clientX, e.clientY, next, view))
  }

  const current = images[index]
  if (typeof document === 'undefined' || !current) return null

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={current.alt} className="fixed inset-0 z-[90] bg-[#140508] text-ivory">
      <div
        ref={stage}
        className="absolute inset-0 touch-none select-none overflow-hidden"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={onWheel}
        style={{ cursor: view.scale > 1 ? 'grab' : 'zoom-in' }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- full-resolution original is needed for zooming */}
        <img
          src={current.src}
          alt={current.alt}
          draggable={false}
          className="absolute inset-0 m-auto h-full w-full object-contain"
          style={{
            transform: `translate3d(${view.x}px, ${view.y}px, 0) scale(${view.scale})`,
            transition: interacting ? 'none' : 'transform 0.35s cubic-bezier(0.22,1,0.36,1)',
          }}
        />
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between p-4">
        <span className="eyebrow text-ivory/60">{labels.photo(index + 1, images.length)}</span>
        <button
          ref={closeBtn}
          type="button"
          onClick={onClose}
          aria-label={labels.close}
          className="pointer-events-auto grid size-11 place-items-center rounded-full border border-ivory/25 bg-black/30 backdrop-blur transition-colors hover:bg-ivory hover:text-burgundy"
        >
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>

      {images.length > 1 ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-6 flex items-center justify-center gap-6">
          <button
            type="button"
            onClick={() => go(-1)}
            aria-label="‹"
            className="pointer-events-auto grid size-11 place-items-center rounded-full border border-ivory/25 bg-black/30 backdrop-blur hover:bg-ivory hover:text-burgundy"
          >
            <svg viewBox="0 0 24 24" className="size-5 rtl:rotate-180" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M15 5l-7 7 7 7" />
            </svg>
          </button>
          <div className="flex gap-1.5">
            {images.map((img, i) => (
              <span key={img.src} className={`h-1 rounded-full transition-all ${i === index ? 'w-6 bg-ivory' : 'w-1.5 bg-ivory/35'}`} />
            ))}
          </div>
          <button
            type="button"
            onClick={() => go(1)}
            aria-label="›"
            className="pointer-events-auto grid size-11 place-items-center rounded-full border border-ivory/25 bg-black/30 backdrop-blur hover:bg-ivory hover:text-burgundy"
          >
            <svg viewBox="0 0 24 24" className="size-5 rtl:rotate-180" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      ) : null}
    </div>,
    document.body,
  )
}

// Desktop magnifier: a round lens follows the cursor over the photo.
export function useLens() {
  const [lens, setLens] = useState<{ x: number; y: number; w: number; h: number } | null>(null)
  const enabled = typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches
  return {
    lens: enabled ? lens : null,
    handlers: enabled
      ? {
          onPointerMove: (e: React.PointerEvent<HTMLElement>) => {
            const r = e.currentTarget.getBoundingClientRect()
            setLens({ x: e.clientX - r.left, y: e.clientY - r.top, w: r.width, h: r.height })
          },
          onPointerLeave: () => setLens(null),
        }
      : {},
  }
}

// The lens holds an enlarged copy of the photo, cropped the same way
// (object-fit: cover) so it lines up with what is under the cursor.
export function Lens({
  src,
  lens,
  zoom = 2.6,
  objectPosition = 'center',
}: {
  src: string
  lens: { x: number; y: number; w: number; h: number }
  zoom?: number
  objectPosition?: string
}) {
  const size = 190
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute z-10 overflow-hidden rounded-full border border-ivory/80 bg-ivory shadow-[0_12px_40px_rgba(42,20,24,0.35)]"
      style={{ width: size, height: size, left: lens.x - size / 2, top: lens.y - size / 2 }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- enlarged copy of an already loaded photo */}
      <img
        src={src}
        alt=""
        className="absolute max-w-none object-cover"
        style={{
          width: lens.w * zoom,
          height: lens.h * zoom,
          left: -(lens.x * zoom - size / 2),
          top: -(lens.y * zoom - size / 2),
          objectPosition,
        }}
      />
    </span>
  )
}
