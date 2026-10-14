// Line icons used across the shop, drawn on a 24px grid.

type IconProps = { className?: string }

function Line({ className, d }: IconProps & { d: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  )
}

export const MenuIcon = (p: IconProps) => <Line {...p} d="M3.5 6.5h17M3.5 12h17M3.5 17.5h17" />
export const CloseIcon = (p: IconProps) => <Line {...p} d="M6 6l12 12M18 6L6 18" />
export const HomeIcon = (p: IconProps) => <Line {...p} d="M4 10.5L12 4l8 6.5V20h-5.5v-6h-5v6H4z" />
export const BagIcon = (p: IconProps) => (
  <Line {...p} d="M5 8h14l-1 12.5H6zM9 10.5V7a3 3 0 0 1 6 0v3.5" />
)
export const ChevronIcon = (p: IconProps) => <Line {...p} d="M9 5l7 7-7 7" />
export const CubeIcon = (p: IconProps) => <Line {...p} d="M12 3l8 4.5v9L12 21l-8-4.5v-9zM4 7.5l8 4.5 8-4.5M12 12v9" />
export const UserIcon = (p: IconProps) => <Line {...p} d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4.5 20a7.5 7.5 0 0 1 15 0" />

export const InstagramIcon = (p: IconProps) => (
  <Line {...p} d="M7.5 3.5h9a4 4 0 0 1 4 4v9a4 4 0 0 1-4 4h-9a4 4 0 0 1-4-4v-9a4 4 0 0 1 4-4zM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM17.2 6.8h.01" />
)

export const PERK_ICONS = {
  delivery: 'M3 7h11v9H3zM14 10h4l3 3v3h-7zM7 19a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM17.5 19a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z',
  cod: 'M3 7h18v10H3zM12 14.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM6 10v4M18 10v4',
  exchange: 'M4 9h13l-3-3M20 15H7l3 3',
  advice: 'M4 5h16v11H9.5L5 20v-4H4zM8 9.5h8M8 12.5h5',
  made: 'M12 3.5l2.6 5.3 5.9.9-4.25 4.1 1 5.8L12 16.9l-5.25 2.7 1-5.8L3.5 9.7l5.9-.9z',
}

export function PerkIcon({ name, className }: IconProps & { name: keyof typeof PERK_ICONS }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={PERK_ICONS[name]} />
    </svg>
  )
}

export function WhatsAppIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.3 2.2 2.2 0 0 0 .1-1.3c0-.1-.2-.2-.4-.3z" />
    </svg>
  )
}
