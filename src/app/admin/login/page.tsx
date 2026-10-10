import { Suspense } from 'react'
import { FullLogo } from '@/components/brand/Logo'
import { LoginForm } from '@/components/admin/LoginForm'
import { isSupabaseConfigured } from '@/lib/supabase/env'

export const metadata = { title: 'Connexion' }

export default async function LoginPage({ searchParams }: PageProps<'/admin/login'>) {
  return (
    <main className="grid min-h-svh place-items-center bg-burgundy px-5 py-12">
      <div className="w-full max-w-sm">
        <FullLogo className="mx-auto w-48 text-ivory" />
        <div className="mt-10 rounded-2xl bg-ivory-light p-6 shadow-2xl">
          {isSupabaseConfigured ? (
            <Suspense>
              <LoginForm refused={searchParams.then((p) => p.refus === '1')} />
            </Suspense>
          ) : (
            <p className="text-sm leading-relaxed text-ink">
              La base de données n’est pas encore connectée. Ajoutez les clés Supabase dans le fichier{' '}
              <code className="rounded bg-ink/5 px-1">.env.local</code> (voir <code className="rounded bg-ink/5 px-1">.env.example</code>), puis
              redémarrez le site.
            </p>
          )}
        </div>
      </div>
    </main>
  )
}
