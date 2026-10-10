import type { SVGProps } from 'react'
import { ornament, swan, tagline, wordmark } from './logo-paths'

type MarkProps = SVGProps<SVGSVGElement> & { title?: string }

function Mark({ shape, title, ...props }: MarkProps & { shape: { viewBox: string; d: string } }) {
  return (
    <svg
      viewBox={shape.viewBox}
      fill="currentColor"
      fillRule="evenodd"
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      {...props}
    >
      {title ? <title>{title}</title> : null}
      <path d={shape.d} />
    </svg>
  )
}

export function Swan(props: MarkProps) {
  return <Mark shape={swan} {...props} />
}

export function Wordmark(props: MarkProps) {
  return <Mark shape={wordmark} {...props} />
}

export function Ornament(props: MarkProps) {
  return <Mark shape={ornament} {...props} />
}

export function Tagline(props: MarkProps) {
  return <Mark shape={tagline} {...props} />
}

// Swan, wordmark, ornament and tagline stacked like the original logo.
export function FullLogo({ className }: { className?: string }) {
  return (
    <div className={`flex flex-col items-center ${className ?? ''}`} role="img" aria-label="Royeel — Uniquely yours.">
      <Swan className="w-[39%]" />
      <Wordmark className="mt-[6%] w-full" />
      <Ornament className="mt-[3%] w-[55%]" />
      <Tagline className="mt-[3%] w-[53%]" />
    </div>
  )
}
