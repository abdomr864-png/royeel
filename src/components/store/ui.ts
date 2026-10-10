// Button looks shared by the shop: burgundy for the main action, sand for the
// secondary one (the beige buttons of a classic boutique, in Royeel's colours).
const button =
  'inline-flex items-center justify-center gap-2 rounded-[5px] px-5 text-[0.875rem] font-medium transition-colors disabled:cursor-not-allowed rtl:text-[0.9375rem]'

export const primaryButton = `${button} bg-burgundy text-ivory hover:bg-burgundy-soft disabled:bg-mute/60`
export const secondaryButton = `${button} bg-ivory-dark text-burgundy hover:bg-line disabled:opacity-60`
