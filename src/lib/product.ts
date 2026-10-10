import type { Product, ProductColor, ProductSize } from './types'

// Gallery photos first, then the detail close-ups, each in the admin's order.
export function orderedImages(product: Product) {
  return [...product.product_images].sort((a, b) =>
    a.role === b.role ? a.position - b.position : a.role === 'gallery' ? -1 : 1,
  )
}

export function detailImages(product: Product) {
  return orderedImages(product).filter((img) => img.role === 'detail')
}

export function isSoldOut(product: Product) {
  return product.product_sizes.length > 0 && product.product_sizes.every((s) => s.stock <= 0)
}

export function productPath(locale: string, product: Pick<Product, 'slug'>) {
  return `/${locale}/produit/${product.slug}`
}

export function colorsOf(product: Product) {
  return [...product.product_colors].sort((a, b) => a.position - b.position)
}

// The sizes offered for a colour (or for the product, when it has no colours).
export function sizesFor(product: Product, colorId: string | null) {
  return product.product_sizes.filter((s) => (s.color_id ?? null) === colorId).sort((a, b) => a.position - b.position)
}

// Photos of the picked colour plus the ones shared by every colour.
export function imagesFor(product: Product, colorId: string | null) {
  const all = orderedImages(product)
  const shown = all.filter((img) => !img.color_id || img.color_id === colorId)
  return shown.length ? shown : all
}

// The colour shown first: the first one with stock left.
export function defaultColor(product: Product): ProductColor | null {
  const colors = colorsOf(product)
  return colors.find((c) => sizesFor(product, c.id).some((s) => s.stock > 0)) ?? colors[0] ?? null
}

export function colorOf(product: Product, size: ProductSize) {
  return product.product_colors.find((c) => c.id === size.color_id) ?? null
}
