'use client'

/* eslint-disable @next/next/no-img-element -- admin thumbnails of uploaded files */
import { useRef, useState, useTransition } from 'react'
import { addShowcasePiece, deleteShowcasePiece, saveShowcasePieces } from '@/lib/admin/actions'
import { getBrowserClient } from '@/lib/supabase/browser'
import { MEDIA_BUCKET, mediaUrl } from '@/lib/supabase/env'
import type { ShowcasePiece } from '@/lib/types'
import { btn, input } from './ui'

const MAX_MB = 15

export function ShowcaseManager({ pieces }: { pieces: ShowcasePiece[] }) {
  const [rows, setRows] = useState(pieces)
  const [pending, start] = useTransition()
  const [uploading, setUploading] = useState<string | null>(null)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const dirty = JSON.stringify(rows) !== JSON.stringify(pieces)

  const update = (id: string, patch: Partial<ShowcasePiece>) => setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  const move = (i: number, d: -1 | 1) =>
    setRows((rs) => {
      const j = i + d
      if (j < 0 || j >= rs.length) return rs
      const next = [...rs]
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })

  async function upload(files: FileList) {
    setMsg(null)
    const supabase = getBrowserClient()
    for (const [n, file] of [...files].entries()) {
      if (!file.type.startsWith('image/')) continue
      if (file.size > MAX_MB * 1024 * 1024) {
        setMsg({ ok: false, text: `${file.name} dépasse ${MAX_MB} Mo.` })
        continue
      }
      setUploading(`Envoi ${n + 1}/${files.length}…`)
      const ext = (file.name.split('.').pop() ?? 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg'
      const path = `showcase/${Date.now()}-${n}.${ext}`
      const { error } = await supabase.storage.from(MEDIA_BUCKET).upload(path, file, { contentType: file.type, cacheControl: '31536000' })
      if (error) {
        setMsg({ ok: false, text: `Échec de l’envoi de ${file.name}.` })
        continue
      }
      const res = await addShowcasePiece(path)
      setMsg(res.ok ? { ok: true, text: 'Pièce ajoutée : donnez-lui un nom et un prix, cochez « Affichée », puis enregistrez.' } : { ok: false, text: res.error })
    }
    setUploading(null)
    if (fileInput.current) fileInput.current.value = ''
  }

  return (
    <div>
      <div className="rounded-xl border border-dashed border-line bg-[#faf7f2] p-4">
        <button type="button" disabled={!!uploading} onClick={() => fileInput.current?.click()} className={btn.primary}>
          {uploading ?? 'Ajouter une pièce'}
        </button>
        <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple hidden onChange={(e) => e.target.files && upload(e.target.files)} />
        <p className="mt-2 text-xs text-mute">
          Ces pièces s’affichent dans « Nouveautés », à côté du manteau en vente, sous un voile noir avec « Rupture de stock ». Elles ne peuvent pas être commandées. Une photo par pièce, JPG, PNG ou WebP, {MAX_MB} Mo max.
        </p>
      </div>

      {rows.length === 0 ? <p className="mt-4 text-sm text-mute">Aucune pièce dans la vitrine.</p> : null}

      <ul className="mt-4 grid gap-3">
        {rows.map((piece, i) => (
          <li key={piece.id} className="flex flex-wrap items-start gap-3 rounded-xl border border-line/70 p-3 sm:flex-nowrap">
            <div className="relative h-24 w-[72px] shrink-0 overflow-hidden rounded-md">
              <img src={mediaUrl(piece.image_path)} alt="" className="size-full object-cover" />
              <span className="absolute inset-0 bg-black/80" aria-hidden />
            </div>
            <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-[1fr_1fr_110px]">
              <label className="block">
                <span className="text-xs text-mute">Nom (FR)</span>
                <input value={piece.name_fr} onChange={(e) => update(piece.id, { name_fr: e.target.value })} className={input} />
              </label>
              <label className="block">
                <span className="text-xs text-mute">الاسم (AR)</span>
                <input value={piece.name_ar} onChange={(e) => update(piece.id, { name_ar: e.target.value })} dir="rtl" className={input} />
              </label>
              <label className="block">
                <span className="text-xs text-mute">Prix (DH)</span>
                <input
                  type="number"
                  min={0}
                  inputMode="numeric"
                  value={piece.price_mad || ''}
                  onChange={(e) => update(piece.id, { price_mad: Math.max(0, Math.round(Number(e.target.value) || 0)) })}
                  className={input}
                />
              </label>
              <label className="flex items-center gap-2 text-sm text-ink sm:col-span-3">
                <input type="checkbox" checked={piece.is_published} onChange={(e) => update(piece.id, { is_published: e.target.checked })} className="size-4 accent-burgundy" />
                Affichée sur la boutique
                {piece.image_path.startsWith('/placeholders/') ? <span className="ms-2 text-xs text-amber-700">Photo provisoire</span> : null}
              </label>
            </div>
            <div className="flex shrink-0 items-center">
              <button type="button" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Monter" className="grid size-8 place-items-center text-mute hover:text-ink disabled:opacity-25">
                ↑
              </button>
              <button type="button" disabled={i === rows.length - 1} onClick={() => move(i, 1)} aria-label="Descendre" className="grid size-8 place-items-center text-mute hover:text-ink disabled:opacity-25">
                ↓
              </button>
              <button
                type="button"
                aria-label="Supprimer la pièce"
                onClick={() => {
                  if (!confirm('Supprimer cette pièce de la vitrine ?')) return
                  start(async () => {
                    const res = await deleteShowcasePiece(piece.id)
                    if (!res.ok) setMsg({ ok: false, text: res.error })
                  })
                }}
                className="grid size-8 place-items-center text-mute hover:text-red-700"
              >
                ×
              </button>
            </div>
          </li>
        ))}
      </ul>

      {rows.length > 0 ? (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={pending || !dirty}
            onClick={() =>
              start(async () => {
                const res = await saveShowcasePieces(rows.map(({ id, name_fr, name_ar, price_mad, is_published }) => ({ id, name_fr, name_ar, price_mad, is_published })))
                setMsg(res.ok ? { ok: true, text: res.message ?? 'Enregistré.' } : { ok: false, text: res.error })
              })
            }
            className={btn.primary}
          >
            Enregistrer la vitrine
          </button>
          {msg ? <span className={`text-sm ${msg.ok ? 'text-emerald-700' : 'text-red-700'}`}>{msg.text}</span> : null}
        </div>
      ) : msg ? (
        <p className={`mt-4 text-sm ${msg.ok ? 'text-emerald-700' : 'text-red-700'}`}>{msg.text}</p>
      ) : null}
    </div>
  )
}
