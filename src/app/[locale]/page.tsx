import { getStorefront } from '@/lib/catalog'
import { getDictionary, getLocale } from '@/lib/i18n/get-dictionary'
import { productPath } from '@/lib/product'
import { FullLogo } from '@/components/brand/Logo'
import { HomeHero } from '@/components/store/HomeHero'
import { Faq, Instagram, Perks, Story } from '@/components/store/Sections'
import { DetailsGrid, Eyebrow, ProductCard, ShowcaseCard } from '@/components/store/Showcase'

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

  // Wraps 2 per row on phones, 3 on tablets, 4 on computers; a short last
  // row stays centred, and a single piece keeps a card's width.
  const cell =
    products.length + showcase.length === 1
      ? 'w-full max-w-[340px]'
      : 'w-[calc(50%-8px)] md:w-[calc(33.333%-13.34px)] lg:w-[calc(25%-15px)]'

  return (
    <main>
      <HomeHero />
      <Perks t={t} whatsapp={Boolean(settings.whatsapp_number)} bankTransfer={settings.payments.bank_transfer} />

      <section id="collection" className="scroll-mt-24 bg-ivory px-4 py-16 md:px-8 md:py-24">
        <div className="mx-auto max-w-[1280px]">
          <header className="text-center">
            <Eyebrow center>{t.home.catalogEyebrow}</Eyebrow>
            <h2 className="mt-4 font-display text-[2.25rem] font-medium leading-[1.05] text-ink md:text-[3.125rem] rtl:leading-[1.4]">
              {t.home.catalogTitle[0]} <em className="text-gold rtl:not-italic">{t.home.catalogTitle[1]}</em>
            </h2>
            <p className="mt-3 text-[0.9375rem] text-mute">{t.home.catalogSub}</p>
          </header>
          <ul className="mt-10 flex flex-wrap justify-center gap-x-4 gap-y-5 md:mt-12 md:gap-5">
            {products.map((p) => (
              <li key={p.id} className={cell}>
                <ProductCard product={p} locale={locale} t={t} />
              </li>
            ))}
            {showcase.map((piece) => (
              <li key={piece.id} className={cell}>
                <ShowcaseCard piece={piece} locale={locale} t={t} />
              </li>
            ))}
          </ul>
        </div>
      </section>

      <DetailsGrid product={product} locale={locale} t={t} />
      <Story t={t} href={productPath(locale, product)} />
      <Instagram t={t} url={settings.instagram_url} />
      <Faq t={t} locale={locale} />
    </main>
  )
}
