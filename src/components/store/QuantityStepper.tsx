'use client'

// "− 1 +" box used on the product page and in the cart.
export function QuantityStepper({
  value,
  max,
  onChange,
  label,
  small,
}: {
  value: number
  max: number
  onChange: (n: number) => void
  label: string
  small?: boolean
}) {
  const cell = small ? 'size-8' : 'h-12 w-10'
  return (
    <div role="group" aria-label={label} className="inline-flex shrink-0 items-center rounded-[5px] border border-line bg-ivory-light text-ink">
      <button type="button" aria-label="−" disabled={value <= 1} onClick={() => onChange(value - 1)} className={`${cell} text-lg disabled:opacity-30`}>
        −
      </button>
      <span aria-live="polite" className={`${small ? 'w-6' : 'w-8'} text-center text-sm tabular-nums`}>
        {value}
      </span>
      <button type="button" aria-label="+" disabled={value >= max} onClick={() => onChange(value + 1)} className={`${cell} text-lg disabled:opacity-30`}>
        +
      </button>
    </div>
  )
}
