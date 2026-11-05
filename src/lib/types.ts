export type PaymentMethod = 'cod' | 'bank_transfer' | 'card'
export type OrderStatus = 'new' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled' | 'exchanged'
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded'
export type OrderSource = 'instagram' | 'tiktok' | 'facebook' | 'friend' | 'other'

export const PAYMENT_METHODS: PaymentMethod[] = ['cod', 'bank_transfer', 'card']
export const ORDER_STATUSES: OrderStatus[] = ['new', 'confirmed', 'shipped', 'delivered', 'cancelled', 'exchanged']
export const PAYMENT_STATUSES: PaymentStatus[] = ['pending', 'paid', 'failed', 'refunded']
export const ORDER_SOURCES: OrderSource[] = ['instagram', 'tiktok', 'facebook', 'friend', 'other']

export type ProductImage = {
  id: string
  path: string
  role: 'gallery' | 'detail'
  alt_fr: string
  alt_ar: string
  title_fr: string
  title_ar: string
  caption_fr: string
  caption_ar: string
  width: number | null
  height: number | null
  position: number
  // Shown only when this colour is picked; null shows it for every colour.
  color_id: string | null
}

export type ProductColor = {
  id: string
  name_fr: string
  name_ar: string
  hex: string
  position: number
}

// One size of one colour (color_id null when the product has no colours).
export type ProductSize = {
  id: string
  label: string
  stock: number
  position: number
  is_active: boolean
  color_id: string | null
}

export type Product = {
  id: string
  slug: string
  name_fr: string
  name_ar: string
  subtitle_fr: string
  subtitle_ar: string
  description_fr: string
  description_ar: string
  details_fr: string
  details_ar: string
  size_guide_fr: string
  size_guide_ar: string
  price_mad: number
  model_3d_path: string | null
  is_published: boolean
  position: number
  product_images: ProductImage[]
  product_sizes: ProductSize[]
  product_colors: ProductColor[]
}

// A piece shown in the collection as sold out; it cannot be ordered.
export type ShowcasePiece = {
  id: string
  image_path: string
  name_fr: string
  name_ar: string
  price_mad: number
  is_published: boolean
  position: number
}

export type PublicSettings = {
  payments: Record<PaymentMethod, boolean>
  whatsapp_number: string
  contact_email: string
  instagram_url: string
  tiktok_url: string
  facebook_url: string
  shipping_fee_mad: number
  meta_pixel_id: string
  tiktok_pixel_id: string
  // Visitors see the "Bientôt disponible" page instead of the shop.
  coming_soon: boolean
}

export type Storefront = {
  // Published products in the admin's order; the first one leads the home page.
  products: Product[]
  showcase: ShowcasePiece[]
  settings: PublicSettings
  // True when Supabase is not configured and the built-in demo data is shown.
  demo: boolean
}

export type OrderReceipt = {
  id: string
  order_number: number
  status: OrderStatus
  payment_method: PaymentMethod
  payment_status: PaymentStatus
  full_name: string
  city: string
  total_mad: number
  shipping_mad: number
  created_at: string
  items: { product_name: string; size_label: string; color_name: string; quantity: number; unit_price_mad: number }[]
  bank: { name: string; holder: string; rib: string } | null
  whatsapp_number: string | null
}
