'use client'

import { useState, useTransition } from 'react'
import { createProduct, deleteProduct, moveProduct } from '@/lib/admin/actions'
import { btn, input, Label } from './ui'

// Name and price first; colours, sizes, stock and photos come on the next page.
export function NewProductForm() {
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        const fd = new FormData(e.currentTarget)
        setError(null)
        start(async () => {
          // Goes to the new product's page when it works.
          const res = await createProduct(fd)
          if (!res.ok) setError(res.error)
        })
      }}
      className="grid gap-3"
    >
      <label>
        <Label>Nom (français)</Label>
        <input name="name_fr" required maxLength={120} placeholder="ex. La Robe Satin" className={input} />
      </label>
      <label>
        <Label>Nom (arabe)</Label>
        <input name="name_ar" required maxLength={120} dir="rtl" placeholder="مثلاً فستان الساتان" className={input} />
      </label>
      <label className="max-w-48">
        <Label>Prix (DH)</Label>
        <input name="price_mad" type="number" inputMode="numeric" min={1} required className={input} />
      </label>
      <div className="flex flex-wrap items-center gap-3 pt-1">
        <button type="submit" disabled={pending} className={btn.primary}>
          {pending ? 'Création…' : 'Créer le produit'}
        </button>
        {error ? <span className="text-sm text-red-700">{error}</span> : null}
      </div>
      <p className="text-xs text-mute">Le produit est créé hors ligne. Ajoutez ensuite les photos, les couleurs, les tailles et le stock, puis mettez-le en ligne.</p>
    </form>
  )
}

export function MoveProduct({ productId, first, last }: { productId: string; first: boolean; last: boolean }) {
  const [pending, start] = useTransition()
  const move = (d: -1 | 1) => start(async () => void (await moveProduct(productId, d)))
  return (
    <span className="flex items-center">
      <button type="button" disabled={first || pending} onClick={() => move(-1)} aria-label="Monter" className="grid size-8 place-items-center text-mute hover:text-ink disabled:opacity-25">
        ↑
      </button>
      <button type="button" disabled={last || pending} onClick={() => move(1)} aria-label="Descendre" className="grid size-8 place-items-center text-mute hover:text-ink disabled:opacity-25">
        ↓
      </button>
    </span>
  )
}

export function DeleteProduct({ productId, name }: { productId: string; name: string }) {
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  return (
    <span className="flex items-center gap-3">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (!confirm(`Supprimer « ${name} » ? Ses photos et son stock seront effacés. Les commandes passées restent dans l’historique.`)) return
          start(async () => {
            const res = await deleteProduct(productId)
            if (!res.ok) setError(res.error)
          })
        }}
        className={btn.danger}
      >
        {pending ? 'Suppression…' : 'Supprimer le produit'}
      </button>
      {error ? <span className="text-sm text-red-700">{error}</span> : null}
    </span>
  )
}
