import 'server-only'
import { redirect } from 'next/navigation'
import { connection } from 'next/server'
import { createSessionClient } from '@/lib/supabase/server'

// The signed-in user and whether they are in the admins table. Every admin
// page and action goes through here; the database checks again with RLS.
export async function getAdmin() {
  // Checking the session reads the clock (token expiry): never during prerendering.
  await connection()
  const supabase = await createSessionClient()
  const { data } = await supabase.auth.getClaims()
  const claims = data?.claims
  if (!claims?.sub) return null
  const { data: isAdmin } = await supabase.rpc('is_admin')
  return {
    supabase,
    userId: claims.sub,
    email: typeof claims.email === 'string' ? claims.email : '',
    isAdmin: isAdmin === true,
  }
}

export async function requireAdmin() {
  const admin = await getAdmin()
  if (!admin) redirect('/admin/login')
  if (!admin.isAdmin) redirect('/admin/login?refus=1')
  return admin
}
