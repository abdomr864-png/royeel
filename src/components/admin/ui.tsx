import type { ReactNode } from 'react'
import { STATUS_LABEL, STATUS_STYLE } from '@/lib/admin/labels'
import type { OrderStatus } from '@/lib/types'

export const btn = {
  primary:
    'inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-burgundy px-4 text-sm font-medium text-ivory transition-colors hover:bg-burgundy-soft disabled:opacity-50',
  secondary:
    'inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-line bg-white px-4 text-sm font-medium text-ink transition-colors hover:border-burgundy/50 disabled:opacity-50',
  ghost: 'inline-flex h-9 items-center justify-center gap-2 rounded-lg px-3 text-sm text-mute hover:bg-ink/5 hover:text-ink',
  danger:
    'inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-4 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50',
}

export const input =
  'mt-1 block w-full rounded-lg border border-line bg-white px-3 py-2.5 text-[0.95rem] text-ink outline-none transition-colors focus:border-burgundy focus:ring-2 focus:ring-burgundy/10'

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-3xl text-burgundy md:text-4xl">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-mute">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  )
}

export function Card({ title, children, className, actions }: { title?: string; children: ReactNode; className?: string; actions?: ReactNode }) {
  return (
    <section className={`rounded-2xl border border-line/70 bg-white p-5 md:p-6 ${className ?? ''}`}>
      {title || actions ? (
        <div className="mb-4 flex items-center justify-between gap-3">
          {title ? <h2 className="text-[0.95rem] font-medium text-ink">{title}</h2> : <span />}
          {actions}
        </div>
      ) : null}
      {children}
    </section>
  )
}

export function StatusPill({ status }: { status: OrderStatus }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${STATUS_STYLE[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  )
}

export function Label({ children, hint }: { children: ReactNode; hint?: ReactNode }) {
  return (
    <span className="block text-sm font-medium text-ink">
      {children}
      {hint ? <span className="ms-1 font-normal text-mute">{hint}</span> : null}
    </span>
  )
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-xl border border-dashed border-line px-4 py-10 text-center text-sm text-mute">{children}</p>
}
