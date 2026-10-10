'use client'

import { useRouter } from 'next/navigation'
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Locale } from '@/lib/i18n/config'
import { colorOf } from '@/lib/product'
import type { Product, ProductColor, ProductSize, PublicSettings } from '@/lib/types'
import { track } from '@/lib/tracking/client'
import { getCartLines, setCartLines, useCartLines, type CartLine } from './cart'
import { lockScroll } from './scroll'

// Most pieces of one size a single order can hold (the server allows 5).
export const MAX_PER_SIZE = 5

export type CartItem = { product: Product; color: ProductColor | null; size: ProductSize; quantity: number }
export type Panel = 'menu' | 'cart'

type StoreState = {
  locale: Locale
  products: Product[]
  settings: PublicSettings
  demo: boolean
  cart: CartItem[]
  cartCount: number
  cartTotal: number
  addToCart: (sizeId: string, quantity: number) => void
  setQuantity: (sizeId: string, quantity: number) => void
  removeFromCart: (sizeId: string) => void
  clearCart: () => void
  // The drawer currently open; one at a time.
  panel: Panel | null
  openPanel: (panel: Panel) => void
  closePanel: () => void
  // Goes to the checkout page.
  openCheckout: () => void
}

const StoreContext = createContext<StoreState | null>(null)

export function maxQuantity(size: ProductSize) {
  return Math.max(0, Math.min(MAX_PER_SIZE, size.stock))
}

type SizeIndex = Map<string, { product: Product; size: ProductSize }>

function indexSizes(products: Product[]): SizeIndex {
  return new Map(products.flatMap((product) => product.product_sizes.map((size) => [size.id, { product, size }] as const)))
}

// Matches saved lines with the products' current sizes, dropping sizes that
// were removed or sold out and capping quantities at the stock left.
function resolveCart(lines: CartLine[], sizes: SizeIndex): CartItem[] {
  return lines.flatMap((line) => {
    const found = sizes.get(line.sizeId)
    if (!found) return []
    const quantity = Math.min(line.quantity, maxQuantity(found.size))
    return quantity > 0 ? [{ ...found, color: colorOf(found.product, found.size), quantity }] : []
  })
}

export function cartValue(items: CartItem[]) {
  return items.reduce((sum, item) => sum + item.product.price_mad * item.quantity, 0)
}

export function StoreProvider({
  locale,
  products,
  settings,
  demo,
  children,
}: {
  locale: Locale
  products: Product[]
  settings: PublicSettings
  demo: boolean
  children: ReactNode
}) {
  const lines = useCartLines()
  const router = useRouter()
  const [panel, setPanel] = useState<Panel | null>(null)

  // Links inside the drawers close them on click; the browser's back button
  // and Escape close them here.
  useEffect(() => {
    if (!panel) return
    lockScroll(true)
    const close = () => setPanel(null)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close()
    window.addEventListener('keydown', onKey)
    window.addEventListener('popstate', close)
    return () => {
      lockScroll(false)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('popstate', close)
    }
  }, [panel])

  const sizes = useMemo(() => indexSizes(products), [products])
  const cart = useMemo(() => resolveCart(lines, sizes), [lines, sizes])
  const cartCount = cart.reduce((n, item) => n + item.quantity, 0)
  const cartTotal = cartValue(cart)

  const setQuantity = useCallback(
    (sizeId: string, quantity: number) => {
      const current = getCartLines()
      const size = sizes.get(sizeId)?.size
      if (!size) return
      const capped = Math.min(quantity, maxQuantity(size))
      const others = current.filter((l) => l.sizeId !== sizeId)
      // Keep the line where it was in the list.
      const index = current.findIndex((l) => l.sizeId === sizeId)
      if (capped <= 0) setCartLines(others)
      else if (index === -1) setCartLines([...current, { sizeId, quantity: capped }])
      else setCartLines(current.map((l) => (l.sizeId === sizeId ? { sizeId, quantity: capped } : l)))
    },
    [sizes],
  )

  const addToCart = useCallback(
    (sizeId: string, quantity: number) => {
      const product = sizes.get(sizeId)?.product
      if (!product) return
      const inCart = getCartLines().find((l) => l.sizeId === sizeId)?.quantity ?? 0
      setQuantity(sizeId, inCart + quantity)
      track('AddToCart', {
        value: product.price_mad * quantity,
        contentId: product.slug,
        contentName: product.name_fr,
        quantity,
      })
    },
    [sizes, setQuantity],
  )

  const openCheckout = useCallback(() => {
    // Read the saved lines directly: a "buy now" adds to the cart just before.
    const items = resolveCart(getCartLines(), sizes)
    if (items.length === 0) return
    setPanel(null)
    router.push(`/${locale}/commande`)
    track('InitiateCheckout', {
      value: cartValue(items),
      contentId: items[0].product.slug,
      contentName: items[0].product.name_fr,
      quantity: items.reduce((n, item) => n + item.quantity, 0),
    })
  }, [sizes, locale, router])

  const value = useMemo<StoreState>(
    () => ({
      locale,
      products,
      settings,
      demo,
      cart,
      cartCount,
      cartTotal,
      addToCart,
      setQuantity,
      removeFromCart: (sizeId) => setCartLines(getCartLines().filter((l) => l.sizeId !== sizeId)),
      clearCart: () => setCartLines([]),
      panel,
      openPanel: setPanel,
      closePanel: () => setPanel(null),
      openCheckout,
    }),
    [locale, products, settings, demo, cart, cartCount, cartTotal, addToCart, setQuantity, panel, openCheckout],
  )

  return <StoreContext value={value}>{children}</StoreContext>
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used inside StoreProvider')
  return ctx
}
