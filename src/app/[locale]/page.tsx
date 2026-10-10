import { getStorefront } from '@/lib/catalog'
import { getDictionary, getLocale } from '@/lib/i18n/get-dictionary'
import { FullLogo } from '@/components/brand/Logo'
import { Faq, Perks } from '@/components/store/Sections'
import { DetailsGrid, HomeHero, ProductCard, SectionHeading, ShowcaseCard } from '@/components/store/Showcase'

export default async function HomePage() {
  const locale = await getLocale()
  const t = await getDictionary()
  const { products, showcase, settings } = await getStorefront()
  const [product] = products

  if (!product) {
    return (
      <main className="grid min-h-[70svh] place-items-center bg-burgundy px-6 text-ivory">
        <FullLogo className="w-[min(70vw,360px)]" />
      </main>
    )
  }

  return (
    <main>
      <HomeHero product={product} locale={locale} t={t} />
      <Perks t={t} whatsapp={Boolean(settings.whatsapp_number)} bankTransfer={settings.payments.bank_transfer} />

      <section className="mx-auto max-w-[1440px] px-4 pt-16 md:px-[18px] md:pt-24">
        <SectionHeading>{t.home.newIn}</SectionHeading>
        {products.length + showcase.length === 1 ? (
          <div className="mx-auto mt-10 max-w-[380px] md:mt-14">
            <ProductCard product={product} locale={locale} t={t} />
          </div>
        ) : (
          // Wraps 2 per row on phones, 3 on tablets, 5 on computers; a short last row stays centred.
          <ul className="mt-10 flex flex-wrap justify-center gap-x-4 gap-y-8 md:mt-14 md:gap-x-5 [&>li]:w-[calc(50%-8px)] md:[&>li]:w-[calc(33.333%-13.34px)] lg:[&>li]:w-[calc(20%-16px)]">
            {products.map((p) => (
              <li key={p.id}>
                <ProductCard product={p} locale={locale} t={t} layout="grid" />
              </li>
            ))}
            {showcase.map((piece) => (
              <li key={piece.id}>
                <ShowcaseCard piece={piece} locale={locale} t={t} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <DetailsGrid product={product} locale={locale} t={t} />
      <Faq t={t} locale={locale} />
    </main>
  )
}
