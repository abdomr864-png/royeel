import { NextResponse } from 'next/server'
import { createSessionClient } from '@/lib/supabase/server'

// Landing point of Supabase e-mail links (password reset): trades the one-time
// code for a session, then continues to `next`.
export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const next = url.searchParams.get('next') ?? '/admin'
  const safeNext = next.startsWith('/admin') ? next : '/admin'
  if (code) {
    const supabase = await createSessionClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) return NextResponse.redirect(new URL(safeNext, url))
  }
  return NextResponse.redirect(new URL('/admin/login', url))
}
