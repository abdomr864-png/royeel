'use client'

import { useState } from 'react'

// Rounds the axis maximum up to a clean number (1, 2, 2.5, 5 × 10^n).
function niceMax(v: number) {
  if (v <= 0) return 1
  const p = 10 ** Math.floor(Math.log10(v))
  const n = v / p
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10
  return step * p
}

const nf = new Intl.NumberFormat('fr-FR')
const fmt = (n: number) => nf.format(n)

export type ColumnPoint = { label: string; short: string; value: number; secondary?: string }

// Single-series column chart (revenue per day/month). One hue, 4px rounded
// caps, hairline grid, a tooltip per column on hover and keyboard focus.
export function ColumnChart({ points, unit, ariaLabel }: { points: ColumnPoint[]; unit: string; ariaLabel: string }) {
  const [active, setActive] = useState<number | null>(null)
  const max = niceMax(Math.max(0, ...points.map((p) => p.value)))
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * max)
  const labelEvery = Math.max(1, Math.ceil(points.length / 8))
  const current = active !== null ? points[active] : null

  return (
    <figure aria-label={ariaLabel} className="relative">
      <div className="relative h-56 ps-14">
        {ticks.map((t) => (
          <div key={t} className="absolute inset-x-0 ps-14" style={{ bottom: `${(t / max) * 100}%` }}>
            <div className="h-px bg-[#ebe4da]" />
            <span className="absolute start-0 -translate-y-1/2 text-[11px] tabular-nums text-mute">{fmt(t)}</span>
          </div>
        ))}
        <div className="absolute inset-0 start-14 flex items-end gap-[2px]">
          {points.map((p, i) => (
            <button
              key={p.label}
              type="button"
              onPointerEnter={() => setActive(i)}
              onPointerLeave={() => setActive(null)}
              onFocus={() => setActive(i)}
              onBlur={() => setActive(null)}
              aria-label={`${p.label} : ${fmt(p.value)} ${unit}`}
              className="group relative flex h-full flex-1 items-end justify-center outline-none"
            >
              <span
                className={`block w-full max-w-6 rounded-t-[4px] transition-colors ${active === i ? 'bg-burgundy-soft' : 'bg-burgundy'}`}
                style={{ height: p.value > 0 ? `max(${(p.value / max) * 100}%, 2px)` : 0 }}
              />
            </button>
          ))}
        </div>
        {current && active !== null ? (
          <div
            className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 rounded-lg bg-ink px-3 py-2 text-xs text-ivory shadow-lg"
            style={{ left: `calc(3.5rem + (100% - 3.5rem) * ${(active + 0.5) / points.length})` }}
          >
            <p className="text-sm font-semibold tabular-nums">
              {fmt(current.value)} {unit}
            </p>
            <p className="text-ivory/70">{current.label}</p>
            {current.secondary ? <p className="text-ivory/70">{current.secondary}</p> : null}
          </div>
        ) : null}
      </div>
      <div className="mt-2 flex ps-14 text-[11px] text-mute">
        {points.map((p, i) => (
          <span key={p.label} className="flex-1 text-center">
            {i % labelEvery === 0 ? p.short : ''}
          </span>
        ))}
      </div>
    </figure>
  )
}

export type BarItem = { label: string; value: number; detail?: string }

// Horizontal bars with the value at the tip; every value is visible.
export function BarList({ items, unit, empty }: { items: BarItem[]; unit?: string; empty: string }) {
  if (items.length === 0) return <p className="py-6 text-center text-sm text-mute">{empty}</p>
  const max = Math.max(...items.map((i) => i.value), 1)
  return (
    <ul className="grid gap-3">
      {items.map((item) => (
        <li key={item.label} className="grid grid-cols-[minmax(84px,30%)_1fr] items-center gap-3 text-sm">
          <span className="truncate text-ink">{item.label}</span>
          <span className="flex items-center gap-2">
            <span className="h-3 rounded-e-[4px] bg-burgundy" style={{ width: `${Math.max((item.value / max) * 75, 1)}%` }} />
            <span className="whitespace-nowrap tabular-nums text-ink">
              {fmt(item.value)}
              {unit ? ` ${unit}` : ''}
              {item.detail ? <span className="text-mute"> · {item.detail}</span> : null}
            </span>
          </span>
        </li>
      ))}
    </ul>
  )
}
