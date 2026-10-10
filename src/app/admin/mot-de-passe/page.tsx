import { FullLogo } from '@/components/brand/Logo'
import { NewPasswordForm } from '@/components/admin/NewPasswordForm'

export const metadata = { title: 'Nouveau mot de passe' }

export default function NewPasswordPage() {
  return (
    <main className="grid min-h-svh place-items-center bg-burgundy px-5 py-12">
      <div className="w-full max-w-sm">
        <FullLogo className="mx-auto w-48 text-ivory" />
        <div className="mt-10 rounded-2xl bg-ivory-light p-6 shadow-2xl">
          <NewPasswordForm />
        </div>
      </div>
    </main>
  )
}
