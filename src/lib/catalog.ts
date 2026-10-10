import { cacheLife, cacheTag } from 'next/cache'
import { isSupabaseConfigured } from './supabase/env'
import { createPublicClient } from './supabase/public'
import type { Product, PublicSettings, ShowcasePiece, Storefront } from './types'

// Everything the storefront shows is cached under this tag. The admin panel and
// new orders refresh it.
export const STORE_TAG = 'store'

export async function getStorefront(): Promise<Storefront> {
  'use cache'
  cacheTag(STORE_TAG)
  cacheLife('hours')

  if (!isSupabaseConfigured) return DEMO_STOREFRONT

  const supabase = createPublicClient()
  const [products, showcase, settings] = await Promise.all([
    supabase
      .from('products')
      .select('*, product_images(*), product_sizes(*), product_colors(*)')
      .eq('is_published', true)
      .order('position')
      .order('created_at'),
    supabase.from('showcase_pieces').select('*').eq('is_published', true).order('position'),
    supabase.rpc('get_public_settings'),
  ])
  if (products.error) throw new Error(`Could not load products: ${products.error.message}`)
  if (showcase.error) throw new Error(`Could not load showcase pieces: ${showcase.error.message}`)
  if (settings.error) throw new Error(`Could not load settings: ${settings.error.message}`)

  const list = (products.data ?? []) as Product[]
  for (const product of list) {
    product.product_images.sort((a, b) => a.position - b.position)
    product.product_colors.sort((a, b) => a.position - b.position)
    product.product_sizes = product.product_sizes
      .filter((s) => s.is_active)
      .sort((a, b) => a.position - b.position)
  }
  return { products: list, showcase: showcase.data as ShowcasePiece[], settings: settings.data as PublicSettings, demo: false }
}

// Shown before Supabase is connected, mirroring the seed migration.
const DEMO_PRODUCT: Product = {
  id: 'demo',
  slug: 'manteau-perle',
  name_fr: 'Le Manteau Perle',
  name_ar: 'معطف اللؤلؤة',
  subtitle_fr: 'Tweed bleu poudré, col bijou',
  subtitle_ar: 'تويد أزرق بودري، ياقة مرصّعة',
  description_fr:
    "Coupé dans un tweed bleu poudré, ce manteau long épouse la silhouette puis tombe avec fluidité. Son grand col pointu est rehaussé de bijoux dorés et perlés, ses boutons-bijoux et ses poches cloutées en font une pièce d'exception : pensée pour être portée, remarquée, et gardée.",
  description_ar:
    'مُفصّل من قماش التويد بلون أزرق بودري، يحتضن هذا المعطف الطويل القوام ثم ينسدل بانسيابية. ياقته المدببة الكبيرة مزيّنة بحُليّ ذهبية ولؤلؤية، وأزراره المرصّعة وجيوبه المزخرفة تجعل منه قطعة استثنائية: صُمّم ليُلبَس، ويلفت الأنظار، ويدوم.',
  details_fr:
    "Tweed texturé bleu poudré\nGrand col pointu orné de bijoux dorés et perlés\nBoutons-bijoux dorés au cœur nacré\nPoches à rabat cloutées d'or\nCoupe longue et ajustée",
  details_ar:
    'تويد بملمس غني بلون أزرق بودري\nياقة مدببة كبيرة مزيّنة بحُليّ ذهبية ولؤلؤية\nأزرار ذهبية مرصّعة بقلب لؤلؤي\nجيوب بغطاء مزيّنة بمسامير ذهبية\nقصّة طويلة ومحدّدة للقوام',
  size_guide_fr: '',
  size_guide_ar: '',
  price_mad: 1500,
  model_3d_path: null,
  is_published: true,
  position: 0,
  // Gallery photos only: without close-ups, the home page has no "Les détails" section.
  product_images: [
    img('front', '/placeholders/perle-main.jpg', 'gallery', 0, ['Le Manteau Perle porté', 'معطف اللؤلؤة ملبوساً'], ['', ''], ['', '']),
    img('collar', '/placeholders/collar.jpg', 'gallery', 1, ['Col orné de bijoux dorés et perlés', 'ياقة مزيّنة بحُليّ ذهبية ولؤلؤية'], ['', ''], ['', '']),
    img('buttons', '/placeholders/buttons.jpg', 'gallery', 2, ['Boutons-bijoux dorés au cœur nacré', 'أزرار ذهبية بقلب لؤلؤي'], ['', ''], ['', '']),
    img('pocket', '/placeholders/pocket.jpg', 'gallery', 3, ["Poche à rabat cloutée d'or", 'جيب بغطاء مزيّن بمسامير ذهبية'], ['', ''], ['', '']),
  ],
  product_sizes: ['S', 'M', 'L', 'XL'].map((label, position) => ({
    id: `demo-${label}`,
    label,
    stock: 5,
    position,
    is_active: true,
    color_id: 'demo-bleu',
  })),
  product_colors: [{ id: 'demo-bleu', name_fr: 'Bleu poudré', name_ar: 'أزرق بودري', hex: '#B9C5D4', position: 0 }],
}

function img(
  id: string,
  path: string,
  role: 'gallery' | 'detail',
  position: number,
  [alt_fr, alt_ar]: [string, string],
  [title_fr, title_ar]: [string, string],
  [caption_fr, caption_ar]: [string, string],
) {
  return { id, path, role, position, alt_fr, alt_ar, title_fr, title_ar, caption_fr, caption_ar, width: null, height: null, color_id: null }
}

const DEMO_SHOWCASE: ShowcasePiece[] = (
  [
    ['camel', '/placeholders/camel-front.jpg', 'Le Manteau Camel', 'معطف كاميل', 1000],
    ['ruban', '/placeholders/showcase-ruban.jpg', 'Le Manteau Ruban', 'معطف الشرائط', 1500],
    ['rose', '/placeholders/showcase-rose.jpg', 'Le Manteau Rose', 'معطف وردي', 1500],
    ['creme', '/placeholders/showcase-creme.jpg', 'Le Manteau Crème', 'معطف كريمي', 1500],
  ] as const
).map(([id, image_path, name_fr, name_ar, price_mad], position) => ({
  id: `demo-${id}`,
  image_path,
  name_fr,
  name_ar,
  price_mad,
  is_published: true,
  position,
}))

const DEMO_SETTINGS: PublicSettings = {
  payments: { cod: true, bank_transfer: true, card: false },
  whatsapp_number: '212650369437',
  contact_email: '',
  instagram_url: '',
  tiktok_url: '',
  facebook_url: '',
  shipping_fee_mad: 0,
  meta_pixel_id: '',
  tiktok_pixel_id: '',
}

const DEMO_STOREFRONT: Storefront = { products: [DEMO_PRODUCT], showcase: DEMO_SHOWCASE, settings: DEMO_SETTINGS, demo: true }
