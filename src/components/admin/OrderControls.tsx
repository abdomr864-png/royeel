'use client'

import { useState, useTransition } from 'react'
import { logWhatsAppContact, saveOrderNote, setOrderStatus, setPaymentStatus } from '@/lib/admin/actions'
import { PAYMENT_STATUS_LABEL, STATUS_LABEL, STATUS_STYLE } from '@/lib/admin/labels'
import { ORDER_STATUSES, PAYMENT_STATUSES, type OrderStatus, type PaymentStatus } from '@/lib/types'
import { btn, input } from './ui'

export function OrderStatusSelect({ orderId, status, compact }: { orderId: string; status: OrderStatus; compact?: boolean }) {
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  return (
    <div className="relative">
      <select
        aria-label="Statut de la commande"
        value={status}
        disabled={pending}
        onChange={(e) => {
          const next = e.target.value
          if (next === 'cancelled' && !confirm('Annuler cette commande ? Les pièces seront remises en stock.')) return
          setError(null)
          start(async () => {
            const res = await setOrderStatus(orderId, next)
            if (!res.ok) setError(res.error)
          })
        }}
        className={`cursor-pointer rounded-full border-0 py-1 pe-7 ps-3 text-xs font-medium ring-1 ring-inset ${STATUS_STYLE[status]} ${pending ? 'opacity-50' : ''} ${compact ? '' : 'text-sm'}`}
      >
        {ORDER_STATUSES.map((s) => (
          <option key={s} value={s}>
            {STATUS_LABEL[s]}
          </option>
        ))}
      </select>
      {error ? <p className="absolute end-0 top-full z-10 mt-1 w-56 rounded-lg bg-red-50 px-2 py-1 text-xs text-red-800 shadow">{error}</p> : null}
    </div>
  )
}

export function StatusButtons({ orderId, status }: { orderId: string; status: OrderStatus }) {
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  // The usual next step first.
  const next: Partial<Record<OrderStatus, OrderStatus>> = { new: 'confirmed', confirmed: 'shipped', shipped: 'delivered' }
  const go = (s: OrderStatus) => {
    if (s === 'cancelled' && !confirm('Annuler cette commande ? Les pièces seront remises en stock.')) return
    setError(null)
    start(async () => {
      const res = await setOrderStatus(orderId, s)
      if (!res.ok) setError(res.error)
    })
  }
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {next[status] ? (
          <button type="button" disabled={pending} onClick={() => go(next[status]!)} className={btn.primary}>
            Marquer « {STATUS_LABEL[next[status]!]} »
          </button>
        ) : null}
        {ORDER_STATUSES.filter((s) => s !== status && s !== next[status]).map((s) => (
          <button key={s} type="button" disabled={pending} onClick={() => go(s)} className={s === 'cancelled' ? btn.danger : btn.secondary}>
            {STATUS_LABEL[s]}
          </button>
        ))}
      </div>
      {error ? <p className="mt-2 text-sm text-red-700">{error}</p> : null}
    </div>
  )
}

export function PaymentStatusSelect({ orderId, status }: { orderId: string; status: PaymentStatus }) {
  const [pending, start] = useTransition()
  return (
    <select
      aria-label="Statut du paiement"
      value={status}
      disabled={pending}
      onChange={(e) => {
        const v = e.target.value
        start(async () => {
          await setPaymentStatus(orderId, v)
        })
      }}
      className={`${input} mt-0 w-auto py-1.5 text-sm`}
    >
      {PAYMENT_STATUSES.map((s) => (
        <option key={s} value={s}>
          {PAYMENT_STATUS_LABEL[s]}
        </option>
      ))}
    </select>
  )
}

export function NoteForm({ orderId, note }: { orderId: string; note: string }) {
  const [value, setValue] = useState(note)
  const [pending, start] = useTransition()
  const [msg, setMsg] = useState<string | null>(null)
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        start(async () => {
          const res = await saveOrderNote(orderId, value)
          setMsg(res.ok ? (res.message ?? 'Enregistré.') : res.error)
        })
      }}
    >
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={3}
        placeholder="Ex. : appelée à 14h, confirme la taille M, livrer après 18h."
        className={input}
      />
      <div className="mt-2 flex items-center gap-3">
        <button type="submit" disabled={pending || value === note} className={btn.secondary}>
          Enregistrer la note
        </button>
        {msg ? <span className="text-sm text-mute">{msg}</span> : null}
      </div>
    </form>
  )
}

export type WhatsAppTemplate = { key: string; label: string; href: string }

export function WhatsAppButtons({ orderId, templates, phoneHref }: { orderId: string; templates: WhatsAppTemplate[]; phoneHref: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      {templates.map((t) => (
        <a
          key={t.key}
          href={t.href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => void logWhatsAppContact(orderId, t.label)}
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#1f7a4d] px-4 text-sm font-medium text-white hover:bg-[#186640]"
        >
          <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden>
            <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm4.5 12.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.3 2.2 2.2 0 0 0 .1-1.3c0-.1-.2-.2-.4-.3z" />
          </svg>
          {t.label}
        </a>
      ))}
      <a href={phoneHref} className={btn.secondary}>
        Appeler
      </a>
    </div>
  )
}
