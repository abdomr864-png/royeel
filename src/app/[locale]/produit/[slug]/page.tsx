import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { getStorefront } from '@/lib/catalog'
import { getDictionary, getLocale } from '@/lib/i18n/get-dictionary'
import { pick } from '@/lib/localize'
import { orderedImages } from '@/lib/product'
import { mediaUrl } from '@/lib/supabase/env'
import { ProductView } from '@/components/store/ProductView'
import { Faq } from '@/components/store/Sections'
import { DetailsGrid } from '@/components/store/Showcase'

type Params = PageProps<'/[locale]/produit/[slug]'>['params']

export async function generateStaticParams() {
  const { products } = await getStorefront()
  return products.length ? products.map((p) => ({ slug: p.slug })) : [{ slug: 'manteau-perle' }]
}

async function productFor(params: Params) {
  const { slug } = await params
  const { products } = await getStorefront()
  return products.find((p) => p.slug === slug) ?? null
}

export async function generateMetadata({ params }: PageProps<'/[locale]/produit/[slug]'>): Promise<Metadata> {
  const product = await productFor(params)
  if (!product) return {}
  const locale = await getLocale()
  const cover = orderedImages(product)[0]
  const path = `/produit/${product.slug}`
  const title = pick(product, 'name', locale)
  const description = pick(product, 'description', locale).slice(0, 160)
  return {
    title,
    description,
    alternates: { canonical: `/${locale}${path}`, languages: { fr: `/fr${path}`, ar: `/ar${path}` } },
    // A page's openGraph replaces the layout's one instead of merging with it.
    openGraph: {
      type: 'website',
      siteName: 'Royeel',
      locale: locale === 'ar' ? 'ar_MA' : 'fr_MA',
      title,
      description,
      images: cover ? [{ url: mediaUrl(cover.path) }] : [{ url: '/brand/og.png', width: 1200, height: 630, alt: 'Royeel' }],
    },
  }
}

// The slug comes from the URL, so the product renders inside <Suspense>; links
// to this page prefetch it, which makes the navigation instant.
export default function ProductPage({ params }: PageProps<'/[locale]/produit/[slug]'>) {
  return (
    <main>
      <Suspense fallback={<ProductSkeleton />}>
        <ProductContent params={params} />
      </Suspense>
    </main>
  )
}

async function ProductContent({ params }: { params: Params }) {
  const product = await productFor(params)
  if (!product) notFound()
  const locale = await getLocale()
  const t = await getDictionary()
  return (
    <>
      <ProductView product={product} />
      <div className="border-t border-line">
        <DetailsGrid product={product} locale={locale} t={t} />
      </div>
      <Faq t={t} locale={locale} />
    </>
  )
}

function ProductSkeleton() {
  return (
    <div aria-hidden className="mx-auto grid max-w-[1280px] gap-8 px-4 pb-14 pt-14 md:grid-cols-[1.1fr_1fr] md:gap-10 md:px-8 md:pt-20 lg:gap-14">
      <div className="aspect-[3/4] animate-pulse rounded-[20px] bg-ivory-dark" />
      <div className="space-y-4">
        <div className="h-10 w-2/3 bg-ivory-dark" />
        <div className="h-5 w-1/3 bg-ivory-dark" />
        <div className="h-24 w-full bg-ivory-dark/60" />
      </div>
    </div>
  )
}
