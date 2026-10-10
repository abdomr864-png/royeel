'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { getBrowserClient } from '@/lib/supabase/browser'
import { btn, input, Label } from './ui'

export function NewPasswordForm() {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const password = String(fd.get('password') ?? '')
    if (password.length < 10) {
      setError('Au moins 10 caractères.')
      return
    }
    if (password !== fd.get('confirm')) {
      setError('Les deux mots de passe ne correspondent pas.')
      return
    }
    setPending(true)
    const { error: err } = await getBrowserClient().auth.updateUser({ password })
    setPending(false)
    if (err) {
      setError('Le lien a expiré. Recommencez depuis « Mot de passe oublié ».')
      return
    }
    router.replace('/admin')
    router.refresh()
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <h1 className="font-display text-2xl text-burgundy">Nouveau mot de passe</h1>
      <label>
        <Label>Mot de passe</Label>
        <input name="password" type="password" autoComplete="new-password" required className={input} />
      </label>
      <label>
        <Label>Confirmer</Label>
        <input name="confirm" type="password" autoComplete="new-password" required className={input} />
      </label>
      {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p> : null}
      <button type="submit" disabled={pending} className={`${btn.primary} h-11`}>
        {pending ? '…' : 'Enregistrer'}
      </button>
    </form>
  )
}
