'use client'

import { useSyncExternalStore } from 'react'

// The cart lives in the visitor's browser (localStorage), so it survives a
// reload and stays in sync between tabs. Lines only hold size ids: prices and
// stock always come from the current product data.
export type CartLine = { sizeId: string; quantity: number }

const KEY = 'royeel_cart'
const EMPTY: CartLine[] = []
const listeners = new Set<() => void>()
let lines: CartLine[] | null = null

function isLine(value: unknown): value is CartLine {
  const line = value as Partial<CartLine> | null
  return typeof line?.sizeId === 'string' && Number.isInteger(line.quantity) && (line.quantity ?? 0) > 0
}

function load(): CartLine[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    return Array.isArray(parsed) ? parsed.filter(isLine) : EMPTY
  } catch {
    return EMPTY
  }
}

export function getCartLines() {
  lines ??= load()
  return lines
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  const onStorage = (e: StorageEvent) => {
    if (e.key !== KEY) return
    lines = null
    listener()
  }
  window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', onStorage)
  }
}

export function useCartLines() {
  return useSyncExternalStore(subscribe, getCartLines, () => EMPTY)
}

const noSubscription = () => () => {}

// False on the server and during hydration, when the saved cart is not read
// yet: lets a page wait instead of flashing "your cart is empty".
export function useCartReady() {
  return useSyncExternalStore(
    noSubscription,
    () => true,
    () => false,
  )
}

export function setCartLines(next: CartLine[]) {
  lines = next
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // Storage blocked (private mode): the cart still works until the tab closes.
  }
  for (const listener of listeners) listener()
}
