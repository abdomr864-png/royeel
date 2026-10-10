'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'
import { prefersReducedMotion } from './scroll'

const EVERY_MS = 5000

// Banner photos: side by side on computers; on phones one at a time,
// cross-fading every few seconds (only the first with reduced motion).
export function HeroSlides({ photos, alts }: { photos: string[]; alts: string[] }) {
  const [active, setActive] = useState(0)

  useEffect(() => {
    if (photos.length < 2 || prefersReducedMotion() || window.matchMedia('(min-width: 48rem)').matches) return
    const id = setInterval(() => setActive((i) => (i + 1) % photos.length), EVERY_MS)
    return () => clearInterval(id)
  }, [photos.length])

  return (
    <div className="absolute inset-0 md:grid" style={{ gridTemplateColumns: `repeat(${photos.length}, minmax(0, 1fr))` }}>
      {photos.map((src, i) => (
        <div
          key={src}
          className={`absolute inset-0 transition-opacity duration-1000 md:relative md:opacity-100 ${i === active ? 'opacity-100' : 'opacity-0'}`}
        >
          <Image
            src={src}
            alt={alts[i] ?? ''}
            fill
            loading="eager"
            quality={90}
            sizes={`(min-width: 768px) ${Math.ceil(100 / photos.length)}vw, 100vw`}
            className="object-cover"
          />
        </div>
      ))}
    </div>
  )
}
