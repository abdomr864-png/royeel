'use client'

import { useState, useTransition } from 'react'
import { saveProduct } from '@/lib/admin/actions'
import type { Product } from '@/lib/types'
import { btn, input, Label } from './ui'

type Field = { name: keyof Product & string; label: string; multiline?: boolean; hint?: string }

const PAIRS: { title: string; fr: Field; ar: Field }[] = [
  { title: 'Nom', fr: { name: 'name_fr', label: 'Français' }, ar: { name: 'name_ar', label: 'Arabe' } },
  { title: 'Sous-titre', fr: { name: 'subtitle_fr', label: 'Français' }, ar: { name: 'subtitle_ar', label: 'Arabe' } },
  { title: 'Description', fr: { name: 'description_fr', label: 'Français', multiline: true }, ar: { name: 'description_ar', label: 'Arabe', multiline: true } },
  {
    title: 'Détails (un par ligne : matière, entretien, coupe…)',
    fr: { name: 'details_fr', label: 'Français', multiline: true },
    ar: { name: 'details_ar', label: 'Arabe', multiline: true },
  },
  {
    title: 'Guide des tailles (laisser vide pour le masquer)',
    fr: { name: 'size_guide_fr', label: 'Français', multiline: true, hint: 'ex. S : 36 · tour de poitrine 86 cm' },
    ar: { name: 'size_guide_ar', label: 'Arabe', multiline: true },
  },
]

export function ProductForm({ product }: { product: Product }) {
  const [pending, start] = useTransition()
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        const fd = new FormData(e.currentTarget)
        start(async () => {
          const res = await saveProduct(product.id, fd)
          setMsg(res.ok ? { ok: true, text: res.message ?? 'Enregistré.' } : { ok: false, text: res.error })
        })
      }}
      className="grid gap-5"
    >
      <label className="max-w-48">
        <Label>Prix (DH)</Label>
        <input name="price_mad" type="number" inputMode="numeric" min={1} required defaultValue={product.price_mad} className={input} />
      </label>

      {PAIRS.map((pair) => (
        <fieldset key={pair.title}>
          <legend className="mb-1 text-sm font-medium text-ink">{pair.title}</legend>
          <div className="grid gap-3 md:grid-cols-2">
            {[pair.fr, pair.ar].map((f) => (
              <label key={f.name}>
                <span className="text-xs text-mute">
                  {f.label}
                  {f.hint ? ` — ${f.hint}` : ''}
                </span>
                {f.multiline ? (
                  <textarea
                    name={f.name}
                    rows={4}
                    defaultValue={String(product[f.name] ?? '')}
                    dir={f.name.endsWith('_ar') ? 'rtl' : 'ltr'}
                    className={input}
                  />
                ) : (
                  <input name={f.name} defaultValue={String(product[f.name] ?? '')} dir={f.name.endsWith('_ar') ? 'rtl' : 'ltr'} className={input} />
                )}
              </label>
            ))}
          </div>
        </fieldset>
      ))}

      <label className="flex items-center gap-3 rounded-xl bg-[#faf7f2] px-4 py-3 text-sm">
        <input name="is_published" type="checkbox" defaultChecked={product.is_published} className="size-4 accent-burgundy" />
        <span>
          <span className="font-medium text-ink">En ligne</span>
          <span className="block text-mute">Décochez pour cacher le produit de la boutique.</span>
        </span>
      </label>

      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className={btn.primary}>
          {pending ? 'Enregistrement…' : 'Enregistrer'}
        </button>
        {msg ? <span className={`text-sm ${msg.ok ? 'text-emerald-700' : 'text-red-700'}`}>{msg.text}</span> : null}
      </div>
    </form>
  )
}
