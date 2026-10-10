'use client'

import Image from 'next/image'
import Link from 'next/link'
import { dictionaryFor } from '@/lib/i18n/dictionaries'
import { formatPrice } from '@/lib/format'
import { pick } from '@/lib/localize'
import { imagesFor } from '@/lib/product'
import { mediaUrl } from '@/lib/supabase/env'
import { Drawer } from './Drawer'
import { BagIcon } from './icons'
import { QuantityStepper } from './QuantityStepper'
import { maxQuantity, useStore } from './StoreContext'
import { primaryButton, secondaryButton } from './ui'

export function CartDrawer() {
  const { locale, settings, cart, cartTotal, setQuantity, removeFromCart, panel, closePanel, openCheckout } = useStore()
  const t = dictionaryFor(locale)
  const shipping = settings.shipping_fee_mad

  return (
    <Drawer open={panel === 'cart'} side="end" title={t.cart.title} closeLabel={t.nav.close} onClose={closePanel}>
      {cart.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-5 px-6 py-16 text-center">
          <BagIcon className="size-14 text-line" />
          <p className="text-mute">{t.cart.empty}</p>
          <Link href={`/${locale}`} onClick={closePanel} className={`${secondaryButton} h-11`}>
            {t.cart.backToShop}
          </Link>
        </div>
      ) : (
        <>
          <ul className="flex-1 divide-y divide-line px-5">
            {cart.map(({ product, color, size, quantity }) => {
              const cover = imagesFor(product, color?.id ?? null)[0]
              return (
              <li key={size.id} className="flex gap-4 py-5">
                <div className="relative h-24 w-[72px] shrink-0 overflow-hidden bg-ivory-dark">
                  {cover ? <Image src={mediaUrl(cover.path)} alt="" fill sizes="72px" className="object-cover object-top" /> : null}
                </div>
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-ink">{pick(product, 'name', locale)}</p>
                    <p className="whitespace-nowrap text-ink">{formatPrice(product.price_mad * quantity, locale)}</p>
                  </div>
                  <p className="text-sm text-mute">
                    {color ? `${pick(color, 'name', locale)} · ` : ''}
                    {t.product.size} : {size.label}
                  </p>
                  <div className="mt-auto flex items-center justify-between pt-3">
                    <QuantityStepper
                      value={quantity}
                      max={maxQuantity(size)}
                      onChange={(n) => setQuantity(size.id, n)}
                      label={`${t.product.quantity} — ${t.product.size} ${size.label}`}
                      small
                    />
                    <button type="button" onClick={() => removeFromCart(size.id)} className="text-sm text-mute underline underline-offset-4 hover:text-burgundy">
                      {t.cart.remove}
                    </button>
                  </div>
                </div>
              </li>
              )
            })}
          </ul>

          <div className="sticky bottom-0 border-t border-line bg-ivory-light px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4">
            <dl className="grid gap-1.5 text-sm">
              <div className="flex justify-between text-mute">
                <dt>{t.checkout.shipping}</dt>
                <dd>{shipping ? formatPrice(shipping, locale) : t.checkout.free}</dd>
              </div>
              <div className="flex justify-between text-lg text-ink">
                <dt>{t.checkout.total}</dt>
                <dd className="font-medium">{formatPrice(cartTotal + shipping, locale)}</dd>
              </div>
            </dl>
            <button type="button" onClick={openCheckout} className={`${primaryButton} mt-4 h-12 w-full`}>
              {t.cart.checkout}
            </button>
            <button type="button" onClick={closePanel} className={`${secondaryButton} mt-2 h-11 w-full`}>
              {t.cart.continue}
            </button>
          </div>
        </>
      )}
    </Drawer>
  )
}
