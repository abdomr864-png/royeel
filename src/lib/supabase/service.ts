import 'server-only'
import { createClient } from '@supabase/supabase-js'
import { SUPABASE_URL } from './env'

const SECRET_KEY = process.env.SUPABASE_SECRET_KEY ?? ''

export const isServiceConfigured = Boolean(SUPABASE_URL && SECRET_KEY)

// Full-access client for trusted server work (notifications, payment callbacks).
// Never expose it to the browser.
export function createServiceClient() {
  if (!isServiceConfigured) throw new Error('SUPABASE_SECRET_KEY is not set')
  return createClient(SUPABASE_URL, SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
}
