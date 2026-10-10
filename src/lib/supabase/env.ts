export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
export const SUPABASE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? ''

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY)

export const MEDIA_BUCKET = 'product-media'

// Product images and 3D models are stored either in the public product-media
// bucket (a storage path) or in /public (a site-relative URL).
export function mediaUrl(path: string) {
  if (path.startsWith('/') || path.startsWith('http')) return path
  return `${SUPABASE_URL}/storage/v1/object/public/${MEDIA_BUCKET}/${path
    .split('/')
    .map(encodeURIComponent)
    .join('/')}`
}
