'use client'

import type { OrderSource } from '@/lib/types'

const KEY = 'royeel_attribution'
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000
const PARAMS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid', 'ttclid'] as const

export type Attribution = Partial<Record<(typeof PARAMS)[number] | 'landing' | 'referrer', string>> & { at?: number }

// Remembers the last ad click (utm_*, fbclid, ttclid) for 30 days so the order
// can say which campaign it came from.
export function captureAttribution() {
  try {
    const url = new URL(window.location.href)
    const found: Attribution = {}
    for (const p of PARAMS) {
      const v = url.searchParams.get(p)
      if (v) found[p] = v.slice(0, 200)
    }
    if (Object.keys(found).length === 0) return
    found.landing = url.pathname
    if (document.referrer) found.referrer = document.referrer.slice(0, 200)
    found.at = Date.now()
    localStorage.setItem(KEY, JSON.stringify(found))
    if (found.fbclid && !document.cookie.includes('_fbc=')) {
      // Same format the Meta Pixel uses, readable by the server-side event.
      document.cookie = `_fbc=fb.1.${Date.now()}.${found.fbclid}; path=/; max-age=7776000; SameSite=Lax`
    }
  } catch {}
}

export function getAttribution(): Attribution {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return {}
    const data = JSON.parse(raw) as Attribution
    if (!data.at || Date.now() - data.at > MAX_AGE_MS) return {}
    return data
  } catch {
    return {}
  }
}

// Pre-selects "How did you find us?" from the ad that brought the visitor.
export function guessSource(a: Attribution): OrderSource | undefined {
  const s = `${a.utm_source ?? ''} ${a.referrer ?? ''}`.toLowerCase()
  if (a.ttclid || s.includes('tiktok')) return 'tiktok'
  if (s.includes('instagram') || /\big\b/.test(s)) return 'instagram'
  if (a.fbclid || s.includes('facebook') || /\bfb\b/.test(s)) return 'facebook'
  return undefined
}
