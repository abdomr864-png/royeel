import { AdminNav } from '@/components/admin/AdminNav'
import { requireAdmin } from '@/lib/admin/auth'
import { isSupabaseConfigured } from '@/lib/supabase/env'
import { redirect } from 'next/navigation'

export default async function PanelLayout({ children }: LayoutProps<'/admin'>) {
  if (!isSupabaseConfigured) redirect('/admin/login')
  const admin = await requireAdmin()
  return (
    <div className="md:grid md:min-h-svh md:grid-cols-[240px_1fr]">
      <AdminNav email={admin.email} />
      <main className="min-w-0 px-4 pb-24 pt-20 md:px-10 md:pb-12 md:pt-10">
        <div className="mx-auto max-w-[1200px]">{children}</div>
      </main>
    </div>
  )
}
