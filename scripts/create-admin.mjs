// Creates (or promotes) the admin account.
//
//   node --env-file=.env.local scripts/create-admin.mjs you@example.com "a-long-password"
//
// Needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY.

import { createClient } from '@supabase/supabase-js'

const [email, password] = process.argv.slice(2)
if (!email || !password || password.length < 10) {
  console.error('Usage: node --env-file=.env.local scripts/create-admin.mjs <email> <password (10+ characters)>')
  process.exit(1)
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const secret = process.env.SUPABASE_SECRET_KEY
if (!url || !secret) {
  console.error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY in .env.local first.')
  process.exit(1)
}

const supabase = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } })

let userId
const created = await supabase.auth.admin.createUser({ email, password, email_confirm: true })
if (created.error) {
  // Already exists: find it and set the new password.
  const { data, error } = await supabase.auth.admin.listUsers({ perPage: 1000 })
  if (error) throw error
  const user = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase())
  if (!user) throw created.error
  userId = user.id
  const updated = await supabase.auth.admin.updateUserById(userId, { password })
  if (updated.error) throw updated.error
} else {
  userId = created.data.user.id
}

const { error } = await supabase.from('admins').upsert({ user_id: userId })
if (error) throw error
console.log(`Admin ready: ${email}. Sign in at /admin/login`)
