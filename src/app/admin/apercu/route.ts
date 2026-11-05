import { draftMode } from 'next/headers'
import { redirect } from 'next/navigation'
import type { NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/admin/auth'

// Lets the admin see the real shop while visitors get the "Bientôt
// disponible" page. Draft mode sets a cookie that only this browser has.
export async function GET(request: NextRequest) {
  const draft = await draftMode()
  if (request.nextUrl.searchParams.has('fin')) {
    draft.disable()
    redirect('/admin/reglages')
  }
  await requireAdmin()
  draft.enable()
  redirect('/fr')
}
