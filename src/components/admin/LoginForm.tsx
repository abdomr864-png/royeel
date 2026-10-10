'use client'

import { useRouter } from 'next/navigation'
import { use, useState } from 'react'
import { getBrowserClient } from '@/lib/supabase/browser'
import { btn, input, Label } from './ui'

export function LoginForm({ refused }: { refused: Promise<boolean> }) {
  const router = useRouter()
  const wasRefused = use(refused)
  const [mode, setMode] = useState<'login' | 'reset'>('login')
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState<{ kind: 'error' | 'info'; text: string } | null>(
    wasRefused ? { kind: 'error', text: 'Ce compte n’a pas accès à l’administration.' } : null,
  )

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const email = String(fd.get('email') ?? '').trim()
    const password = String(fd.get('password') ?? '')
    const supabase = getBrowserClient()
    setPending(true)
    setMessage(null)
    try {
      if (mode === 'reset') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/admin/auth/callback?next=/admin/mot-de-passe`,
        })
        setMessage(
          error
            ? { kind: 'error', text: 'Impossible d’envoyer l’e-mail. Réessayez.' }
            : { kind: 'info', text: 'Si ce compte existe, un lien pour choisir un nouveau mot de passe vient d’être envoyé.' },
        )
        return
      }
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setMessage({ kind: 'error', text: 'E-mail ou mot de passe incorrect.' })
        return
      }
      router.replace('/admin')
      router.refresh()
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <h1 className="font-display text-2xl text-burgundy">{mode === 'login' ? 'Administration' : 'Mot de passe oublié'}</h1>
      <label>
        <Label>E-mail</Label>
        <input name="email" type="email" autoComplete="email" required className={input} />
      </label>
      {mode === 'login' ? (
        <label>
          <Label>Mot de passe</Label>
          <input name="password" type="password" autoComplete="current-password" required className={input} />
        </label>
      ) : null}
      {message ? (
        <p role="alert" className={`rounded-lg px-3 py-2 text-sm ${message.kind === 'error' ? 'bg-red-50 text-red-800' : 'bg-emerald-50 text-emerald-900'}`}>
          {message.text}
        </p>
      ) : null}
      <button type="submit" disabled={pending} className={`${btn.primary} h-11`}>
        {pending ? '…' : mode === 'login' ? 'Se connecter' : 'Envoyer le lien'}
      </button>
      <button
        type="button"
        onClick={() => {
          setMode(mode === 'login' ? 'reset' : 'login')
          setMessage(null)
        }}
        className="text-sm text-mute underline-offset-4 hover:text-burgundy hover:underline"
      >
        {mode === 'login' ? 'Mot de passe oublié ?' : 'Retour à la connexion'}
      </button>
    </form>
  )
}
