'use client'

/* eslint-disable @next/next/no-img-element -- admin thumbnails of uploaded files */
import { useRef, useState, useTransition } from 'react'
import { addImage, deleteImage, saveImages } from '@/lib/admin/actions'
import { getBrowserClient } from '@/lib/supabase/browser'
import { MEDIA_BUCKET, mediaUrl } from '@/lib/supabase/env'
import type { ProductColor, ProductImage } from '@/lib/types'
import { btn, input } from './ui'

const MAX_MB = 15

export function ImagesManager({ productId, images, colors }: { productId: string; images: ProductImage[]; colors: ProductColor[] }) {
  const [rows, setRows] = useState(images)
  const [openId, setOpenId] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const [uploading, setUploading] = useState<string | null>(null)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const [uploadRole, setUploadRole] = useState<'gallery' | 'detail'>('gallery')
  const dirty = JSON.stringify(rows) !== JSON.stringify(images)

  const update = (id: string, patch: Partial<ProductImage>) => setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)))
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
      const size = await imageSize(file)
      const ext = (file.name.split('.').pop() ?? 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg'
      const path = `products/${productId}/${Date.now()}-${n}.${ext}`
      const { error } = await supabase.storage.from(MEDIA_BUCKET).upload(path, file, { contentType: file.type, cacheControl: '31536000' })
      if (error) {
        setMsg({ ok: false, text: `Échec de l’envoi de ${file.name}.` })
        continue
      }
      const res = await addImage(productId, { path, role: uploadRole, width: size?.width ?? null, height: size?.height ?? null })
      if (!res.ok) setMsg({ ok: false, text: res.error })
    }
    setUploading(null)
    if (fileInput.current) fileInput.current.value = ''
  }

  return (
    <div>
      <div className="rounded-xl border border-dashed border-line bg-[#faf7f2] p-4">
        <div className="flex flex-wrap items-center gap-3">
          <select value={uploadRole} onChange={(e) => setUploadRole(e.target.value as 'gallery' | 'detail')} className={`${input} mt-0 w-auto`} aria-label="Type de photo">
            <option value="gallery">Photo du produit</option>
            <option value="detail">Gros plan (détail)</option>
          </select>
          <button type="button" disabled={!!uploading} onClick={() => fileInput.current?.click()} className={btn.primary}>
            {uploading ?? 'Ajouter des photos'}
          </button>
          <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple hidden onChange={(e) => e.target.files && upload(e.target.files)} />
        </div>
        <p className="mt-2 text-xs text-mute">
          Photos du produit : la 1re est la photo principale. Gros plans : col, boutons, tissu… — ils deviennent la section « Les détails ». Avec plusieurs couleurs, choisissez pour chaque photo la couleur qu’elle montre. JPG, PNG ou WebP, {MAX_MB} Mo max.
        </p>
      </div>

      <ul className="mt-4 grid gap-3">
        {rows.map((img, i) => (
          <li key={img.id} className="rounded-xl border border-line/70">
            <div className="flex items-center gap-3 p-2">
              <img src={mediaUrl(img.path)} alt="" className="h-20 w-16 shrink-0 rounded-md object-cover" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-ink">{img.title_fr || img.alt_fr || (img.role === 'gallery' ? 'Photo du produit' : 'Gros plan')}</p>
                <select value={img.role} onChange={(e) => update(img.id, { role: e.target.value as 'gallery' | 'detail' })} className="mt-1 rounded-md border border-line bg-white px-2 py-1 text-xs" aria-label="Type">
                  <option value="gallery">Photo du produit</option>
                  <option value="detail">Gros plan (détail)</option>
                </select>
                {colors.length > 1 ? (
                  <select
                    value={img.color_id ?? ''}
                    onChange={(e) => update(img.id, { color_id: e.target.value || null })}
                    className="ms-1 mt-1 rounded-md border border-line bg-white px-2 py-1 text-xs"
                    aria-label="Couleur montrée"
                  >
                    <option value="">Toutes les couleurs</option>
                    {colors.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name_fr}
                      </option>
                    ))}
                  </select>
                ) : null}
                {img.path.startsWith('/placeholders/') ? <span className="ms-2 text-xs text-amber-700">Provisoire</span> : null}
              </div>
              <div className="flex shrink-0 items-center">
                <button type="button" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Monter" className="grid size-8 place-items-center text-mute hover:text-ink disabled:opacity-25">
                  ↑
                </button>
                <button type="button" disabled={i === rows.length - 1} onClick={() => move(i, 1)} aria-label="Descendre" className="grid size-8 place-items-center text-mute hover:text-ink disabled:opacity-25">
                  ↓
                </button>
                <button type="button" onClick={() => setOpenId(openId === img.id ? null : img.id)} className="px-2 text-xs text-burgundy hover:underline">
                  Textes
                </button>
                <button
                  type="button"
                  aria-label="Supprimer la photo"
                  onClick={() => {
                    if (!confirm('Supprimer cette photo ?')) return
                    start(async () => {
                      const res = await deleteImage(img.id)
                      if (!res.ok) setMsg({ ok: false, text: res.error })
                    })
                  }}
                  className="grid size-8 place-items-center text-mute hover:text-red-700"
                >
                  ×
                </button>
              </div>
            </div>
            {openId === img.id ? (
              <div className="grid gap-3 border-t border-line/60 p-3 sm:grid-cols-2">
                <TextField label="Description de la photo (FR)" value={img.alt_fr} onChange={(v) => update(img.id, { alt_fr: v })} />
                <TextField label="وصف الصورة (AR)" value={img.alt_ar} onChange={(v) => update(img.id, { alt_ar: v })} rtl />
                {img.role === 'detail' ? (
                  <>
                    <TextField label="Titre du détail (FR)" value={img.title_fr} onChange={(v) => update(img.id, { title_fr: v })} />
                    <TextField label="عنوان التفصيلة (AR)" value={img.title_ar} onChange={(v) => update(img.id, { title_ar: v })} rtl />
                    <TextField label="Texte (FR)" value={img.caption_fr} onChange={(v) => update(img.id, { caption_fr: v })} multiline />
                    <TextField label="النص (AR)" value={img.caption_ar} onChange={(v) => update(img.id, { caption_ar: v })} multiline rtl />
                  </>
                ) : null}
              </div>
            ) : null}
          </li>
        ))}
      </ul>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={pending || !dirty}
          onClick={() =>
            start(async () => {
              const res = await saveImages(
                rows.map(({ id, role, alt_fr, alt_ar, title_fr, title_ar, caption_fr, caption_ar, color_id }) => ({ id, role, alt_fr, alt_ar, title_fr, title_ar, caption_fr, caption_ar, color_id })),
              )
              setMsg(res.ok ? { ok: true, text: res.message ?? 'Enregistré.' } : { ok: false, text: res.error })
            })
          }
          className={btn.primary}
        >
          Enregistrer l’ordre et les textes
        </button>
        {msg ? <span className={`text-sm ${msg.ok ? 'text-emerald-700' : 'text-red-700'}`}>{msg.text}</span> : null}
      </div>
    </div>
  )
}

function TextField({ label, value, onChange, multiline, rtl }: { label: string; value: string; onChange: (v: string) => void; multiline?: boolean; rtl?: boolean }) {
  return (
    <label className="block">
      <span className="text-xs text-mute">{label}</span>
      {multiline ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={3} dir={rtl ? 'rtl' : 'ltr'} className={input} />
      ) : (
        <input value={value} onChange={(e) => onChange(e.target.value)} dir={rtl ? 'rtl' : 'ltr'} className={input} />
      )}
    </label>
  )
}

function imageSize(file: File): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight })
      URL.revokeObjectURL(url)
    }
    img.onerror = () => {
      resolve(null)
      URL.revokeObjectURL(url)
    }
    img.src = url
  })
}
