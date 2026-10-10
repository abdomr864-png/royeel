import { Amiri, Cormorant_Garamond, IBM_Plex_Sans_Arabic, Jost } from 'next/font/google'

export const cormorant = Cormorant_Garamond({
  subsets: ['latin', 'latin-ext'],
  weight: ['300', '400', '500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-cormorant',
  display: 'swap',
})

export const jost = Jost({
  subsets: ['latin', 'latin-ext'],
  weight: ['300', '400', '500'],
  variable: '--font-jost',
  display: 'swap',
})

export const amiri = Amiri({
  subsets: ['arabic'],
  weight: ['400', '700'],
  variable: '--font-amiri',
  display: 'swap',
  preload: false,
})

export const plexArabic = IBM_Plex_Sans_Arabic({
  subsets: ['arabic'],
  weight: ['300', '400', '500'],
  variable: '--font-plex-arabic',
  display: 'swap',
  preload: false,
})

export const fontVariables = [cormorant.variable, jost.variable, amiri.variable, plexArabic.variable].join(' ')
