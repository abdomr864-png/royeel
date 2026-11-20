import { Logo } from '@/components/brand/Logo'
import { NewPasswordForm } from '@/components/admin/NewPasswordForm'

export const metadata = { title: 'Nouveau mot de passe' }

export default function NewPasswordPage() {
  return (
    <main className="grid min-h-svh place-items-center bg-burgundy px-5 py-12">
      <div className="w-full max-w-sm">
        <Logo className="mx-auto w-40" sizes="160px" preload />
        <div className="mt-10 rounded-2xl bg-ivory-light p-6 shadow-2xl">
          <NewPasswordForm />
        </div>
      </div>
    </main>
  )
}
