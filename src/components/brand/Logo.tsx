import Image from 'next/image'
import type { CSSProperties } from 'react'

// The 2026 logo, cut from brand/source/royeel-logo-2026.png by
// brand/make-logo-assets.mjs.

// Swan in its frame above "Royeel", in its own colours. Its background was
// removed against the logo's bordeaux, so it belongs on bg-burgundy only.
export function Logo({ className, preload, sizes = '240px' }: { className?: string; preload?: boolean; sizes?: string }) {
  return (
    <Image
      src="/brand/logo-full.png"
      alt="Royeel"
      width={695}
      height={1187}
      preload={preload}
      sizes={sizes}
      className={`h-auto ${className ?? ''}`}
    />
  )
}

// One-colour parts of the logo, painted in currentColor: they work on any
// background and follow the text colour.
function Mark({ src, ratio, label, className }: { src: string; ratio: string; label?: string; className?: string }) {
  const style: CSSProperties = {
    aspectRatio: ratio,
    maskImage: `url(${src})`,
    WebkitMaskImage: `url(${src})`,
    maskSize: 'contain',
    WebkitMaskSize: 'contain',
    maskRepeat: 'no-repeat',
    WebkitMaskRepeat: 'no-repeat',
    maskPosition: 'center',
    WebkitMaskPosition: 'center',
  }
  return (
    <span
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={`block bg-current ${className ?? ''}`}
      style={style}
    />
  )
}

// "Royeel" in the logo's script.
export function Wordmark({ className, label = 'Royeel' }: { className?: string; label?: string | null }) {
  return <Mark src="/brand/mark-word.png" ratio="634 / 251" label={label ?? undefined} className={className} />
}

// The flourish under the name, used as a divider.
export function Flourish({ className }: { className?: string }) {
  return <Mark src="/brand/mark-flourish.png" ratio="461 / 83" className={className} />
}
