'use client'

import { useRef, useState, useTransition } from 'react'
import { setModel } from '@/lib/admin/actions'
import { getBrowserClient } from '@/lib/supabase/browser'
import { MEDIA_BUCKET } from '@/lib/supabase/env'
import { btn } from './ui'

const MAX_MB = 45

// Uploads the coat's .glb file. Without one, the shop shows a 3D ring of photos.
export function ModelUploader({ productId, path }: { productId: string; path: string | null }) {
  const fileInput = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [pending, start] = useTransition()
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  async function upload(file: File) {
    setMsg(null)
    if (!file.name.toLowerCase().endsWith('.glb')) return setMsg({ ok: false, text: 'Choisissez un fichier .glb.' })
    if (file.size > MAX_MB * 1024 * 1024) return setMsg({ ok: false, text: `Le fichier dépasse ${MAX_MB} Mo.` })
    setBusy(true)
    const newPath = `products/${productId}/model-${Date.now()}.glb`
    const { error } = await getBrowserClient()
      .storage.from(MEDIA_BUCKET)
      .upload(newPath, file, { contentType: 'model/gltf-binary', cacheControl: '31536000' })
    setBusy(false)
    if (error) return setMsg({ ok: false, text: 'Échec de l’envoi du fichier.' })
    start(async () => {
      const res = await setModel(productId, newPath)
      setMsg(res.ok ? { ok: true, text: res.message ?? 'Enregistré.' } : { ok: false, text: res.error })
    })
  }

  return (
    <div className="text-sm">
      <p className="text-ink">{path ? 'Un modèle 3D est en ligne.' : 'Pas encore de modèle 3D : la boutique affiche un carrousel 3D de vos photos.'}</p>
      <p className="mt-1 text-xs text-mute">
        Format .glb, {MAX_MB} Mo max. Il peut être créé à partir de vos photos (face, dos, côtés, fond uni) ou par un graphiste 3D.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" disabled={busy || pending} onClick={() => fileInput.current?.click()} className={btn.secondary}>
          {busy ? 'Envoi…' : path ? 'Remplacer le modèle' : 'Ajouter un modèle 3D'}
        </button>
        {path ? (
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              confirm('Retirer le modèle 3D ?') &&
              start(async () => {
                const res = await setModel(productId, null)
                setMsg(res.ok ? { ok: true, text: res.message ?? '' } : { ok: false, text: res.error })
              })
            }
            className={btn.danger}
          >
            Retirer
          </button>
        ) : null}
      </div>
      <input ref={fileInput} type="file" accept=".glb,model/gltf-binary" hidden onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
      {msg ? <p className={`mt-2 ${msg.ok ? 'text-emerald-700' : 'text-red-700'}`}>{msg.text}</p> : null}
    </div>
  )
}
