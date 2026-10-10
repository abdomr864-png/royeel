'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState, useTransition } from 'react'
import { dictionaryFor } from '@/lib/i18n/dictionaries'
import { formatPrice, normalizeMoroccanPhone } from '@/lib/format'
import { pick } from '@/lib/localize'
import { mediaUrl } from '@/lib/supabase/env'
import { placeOrder, type OrderErrorCode } from '@/lib/orders/actions'
import { getAttribution, guessSource } from '@/lib/tracking/attribution'
import { adCookies, track } from '@/lib/tracking/client'
import { imagesFor } from '@/lib/product'
import { ORDER_SOURCES, PAYMENT_METHODS, type OrderSource, type PaymentMethod } from '@/lib/types'
import { setCartLines, useCartReady } from './cart'
import { BagIcon, CloseIcon } from './icons'
import { QuantityStepper } from './QuantityStepper'
import { maxQuantity, useStore } from './StoreContext'
import { primaryButton, secondaryButton } from './ui'

const CITIES = [
  ['Casablanca', 'الدار البيضاء'],
  ['Rabat', 'الرباط'],
  ['Marrakech', 'مراكش'],
  ['Tanger', 'طنجة'],
  ['Fès', 'فاس'],
  ['Agadir', 'أكادير'],
  ['Meknès', 'مكناس'],
  ['Oujda', 'وجدة'],
  ['Kénitra', 'القنيطرة'],
  ['Tétouan', 'تطوان'],
  ['Salé', 'سلا'],
  ['Témara', 'تمارة'],
  ['Mohammedia', 'المحمدية'],
  ['El Jadida', 'الجديدة'],
  ['Béni Mellal', 'بني ملال'],
  ['Nador', 'الناظور'],
  ['Safi', 'آسفي'],
  ['Laâyoune', 'العيون'],
  ['Dakhla', 'الداخلة'],
  ['Essaouira', 'الصويرة'],
  ['Ifrane', 'إفران'],
  ['Al Hoceïma', 'الحسيمة'],
  ['Khouribga', 'خريبكة'],
  ['Settat', 'سطات'],
]

type Field = 'fullName' | 'phone' | 'email' | 'city' | 'address' | 'source' | 'payment'

const FIELD_OF: Partial<Record<OrderErrorCode, Field>> = {
  INVALID_NAME: 'fullName',
  INVALID_PHONE: 'phone',
  INVALID_EMAIL: 'email',
  INVALID_CITY: 'city',
  INVALID_ADDRESS: 'address',
  INVALID_SOURCE: 'source',
  PAYMENT_METHOD_UNAVAILABLE: 'payment',
}

// "Panier → Paiement → Commande terminée" band at the top of the checkout
// and thank-you pages.
export function CheckoutSteps({ step }: { step: 'payment' | 'done' }) {
  const { locale, openPanel } = useStore()
  const t = dictionaryFor(locale).checkout.steps
  const arrow = (
    <li aria-hidden className="text-mute/70 rtl:-scale-x-100">
      →
    </li>
  )
  const state = (s: 'payment' | 'done') =>
    s === step ? 'text-ink underline decoration-1 underline-offset-[0.4em]' : 'text-mute'

  return (
    <nav aria-label={t.payment} className="bg-ivory">
      <ol className="mx-auto flex max-w-[1440px] items-center gap-3 overflow-x-auto whitespace-nowrap px-4 py-5 text-[1rem] md:gap-5 md:px-[18px] md:py-7 md:text-2xl">
        <li>
          <button type="button" onClick={() => openPanel('cart')} className="text-mute transition-colors hover:text-ink">
            {t.cart}
          </button>
        </li>
        {arrow}
        <li aria-current={step === 'payment' ? 'step' : undefined} className={state('payment')}>
          {t.payment}
        </li>
        {arrow}
        <li aria-current={step === 'done' ? 'step' : undefined} className={state('done')}>
          {t.done}
        </li>
      </ol>
    </nav>
  )
}

// Empties the cart once the visitor reaches the thank-you page.
export function ClearCart() {
  useEffect(() => setCartLines([]), [])
  return null
}

// Checkout page: contact details on one side; the order, the payment method
// and the "order" button on the other.
export function Checkout() {
  const ready = useCartReady()
  const { locale, cart } = useStore()
  const t = dictionaryFor(locale)

  // The saved cart is only readable in the browser; wait for it.
  if (!ready) return <div className="min-h-[60svh]" />

  if (cart.length === 0) {
    return (
      <div className="flex min-h-[50svh] flex-col items-center justify-center gap-5 px-6 py-20 text-center">
        <BagIcon className="size-14 text-line" />
        <p className="text-mute">{t.cart.empty}</p>
        <Link href={`/${locale}`} prefetch className={`${secondaryButton} h-11`}>
          {t.cart.backToShop}
        </Link>
      </div>
    )
  }

  return <CheckoutForm />
}

function CheckoutForm() {
  const { locale, settings, cart, cartCount, cartTotal, setQuantity, removeFromCart } = useStore()
  const t = dictionaryFor(locale)
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<{ code: OrderErrorCode; field?: Field } | null>(null)
  const [source, setSource] = useState<OrderSource | null>(() => guessSource(getAttribution()) ?? null)
  const methods = PAYMENT_METHODS.filter((m) => settings.payments[m])
  const [method, setMethod] = useState<PaymentMethod | null>(methods[0] ?? null)

  const first = cart[0].product
  const shipping = settings.shipping_fee_mad
  const total = cartTotal + shipping

  function showError(code: OrderErrorCode) {
    const field = FIELD_OF[code]
    setError({ code, field })
    formRef.current?.querySelector<HTMLInputElement>(`input[name="${field}"]`)?.focus()
  }

  function submit(form: HTMLFormElement) {
    const fd = new FormData(form)
    const value = (k: string) => String(fd.get(k) ?? '').trim()
    const phone = value('phone')

    // Quick checks before the round trip; the server checks everything again.
    const local: [boolean, OrderErrorCode][] = [
      [value('fullName').length >= 2, 'INVALID_NAME'],
      [normalizeMoroccanPhone(phone) !== null, 'INVALID_PHONE'],
      [value('city').length >= 2, 'INVALID_CITY'],
      [value('address').length >= 5, 'INVALID_ADDRESS'],
      [method !== null, 'PAYMENT_METHOD_UNAVAILABLE'],
      [cart.length > 0, 'EMPTY_CART'],
    ]
    const failed = local.find(([ok]) => !ok)
    if (failed) return showError(failed[1])

    const attribution = getAttribution()
    const cleanAttribution = Object.fromEntries(
      Object.entries(attribution).filter(([k, v]) => k !== 'at' && typeof v === 'string'),
    ) as Record<string, string>

    startTransition(async () => {
      const res = await placeOrder({
        fullName: value('fullName'),
        phone,
        email: value('email'),
        city: value('city'),
        address: value('address'),
        source,
        paymentMethod: method!,
        items: cart.map((item) => ({ sizeId: item.size.id, quantity: item.quantity })),
        locale,
        attribution: cleanAttribution,
        website: value('website') || undefined,
        ...adCookies(),
        pageUrl: window.location.href.split('#')[0],
      })
      if (!res.ok) return showError(res.error)
      track('Purchase', {
        value: res.totalMad,
        contentId: first.slug,
        contentName: first.name_fr,
        quantity: cartCount,
        eventId: res.orderId,
      })
      // The cart is emptied by the thank-you page, so this page does not
      // flash "your cart is empty" while leaving.
      if (res.redirectTo.startsWith('/api/')) window.location.href = res.redirectTo
      else router.push(res.redirectTo)
    })
  }

  const fieldClass = (f: Field) =>
    `mt-1.5 block w-full rounded-[5px] border bg-white px-4 py-3.5 text-[1rem] text-ink outline-none transition-colors placeholder:text-mute/50 focus:border-burgundy ${
      error?.field === f ? 'border-burgundy' : 'border-line'
    }`
  const label = 'block text-[0.9375rem] text-ink'
  const required = <span className="text-burgundy"> *</span>

  return (
    <form
      ref={formRef}
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        submit(e.currentTarget)
      }}
      className="mx-auto grid max-w-[1440px] gap-10 px-4 pb-20 pt-8 md:grid-cols-2 md:gap-8 md:px-[18px] md:pt-10 lg:gap-12"
    >
      <div>
        <h1 className="text-[1.5rem] font-medium text-ink md:text-[1.75rem]">{t.checkout.yourDetails}</h1>
        <div className="mt-6 grid gap-5">
          <label className={label}>
            {t.checkout.fullName}
            {required}
            <input name="fullName" autoComplete="name" required maxLength={120} className={fieldClass('fullName')} />
          </label>
          <label className={label}>
            {t.checkout.phone}
            {required}
            <input
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              dir="ltr"
              required
              maxLength={20}
              placeholder={t.checkout.phonePlaceholder}
              className={`${fieldClass('phone')} rtl:text-right`}
            />
          </label>
          <label className={label}>
            {t.checkout.city}
            {required}
            <input
              name="city"
              list="ma-cities"
              autoComplete="address-level2"
              required
              maxLength={80}
              placeholder={t.checkout.cityPlaceholder}
              className={fieldClass('city')}
            />
          </label>
          <datalist id="ma-cities">
            {CITIES.map(([fr, ar]) => (
              <option key={fr} value={locale === 'ar' ? ar : fr} />
            ))}
          </datalist>
          <label className={label}>
            {t.checkout.address}
            {required}
            <input
              name="address"
              autoComplete="street-address"
              required
              maxLength={300}
              placeholder={t.checkout.addressPlaceholder}
              className={fieldClass('address')}
            />
          </label>
          <label className={label}>
            {t.checkout.email} <span className="text-sm text-mute">({t.checkout.optional})</span>
            <input name="email" type="email" inputMode="email" autoComplete="email" dir="ltr" maxLength={200} className={`${fieldClass('email')} rtl:text-right`} />
            <span className="mt-1 block text-xs text-mute">{t.checkout.emailHint}</span>
          </label>
          {/* Honeypot for bots */}
          <input name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />

          <fieldset>
            <legend className={label}>
              {t.checkout.sourceQuestion} <span className="text-sm text-mute">({t.checkout.optional})</span>
            </legend>
            <div className="mt-3 flex flex-wrap gap-2">
              {ORDER_SOURCES.map((s) => (
                <button
                  key={s}
                  type="button"
                  aria-pressed={source === s}
                  onClick={() => setSource(source === s ? null : s)}
                  className={`rounded-full border px-4 py-2 text-sm transition-colors ${
                    source === s ? 'border-burgundy bg-burgundy text-ivory' : 'border-line bg-white text-ink hover:border-burgundy'
                  }`}
                >
                  {t.checkout.sources[s]}
                </button>
              ))}
            </div>
          </fieldset>
        </div>
      </div>

      <div className="md:sticky md:top-28 md:self-start">
        <div className="border border-ink/70 bg-white/60 p-5 md:p-8">
          <h2 className="text-[1.5rem] font-medium text-ink md:text-[1.75rem]">{t.checkout.title}</h2>

          <div className="mt-5 flex justify-between border-b border-line pb-3 text-[0.9375rem] text-ink">
            <span>{t.checkout.product}</span>
            <span>{t.checkout.subtotal}</span>
          </div>
          <ul className="divide-y divide-line border-b border-line">
            {cart.map(({ product, color, size, quantity }) => {
              const cover = imagesFor(product, color?.id ?? null)[0]
              return (
              <li key={size.id} className="flex items-center gap-3 py-4">
                <button
                  type="button"
                  onClick={() => removeFromCart(size.id)}
                  aria-label={`${t.cart.remove} — ${t.product.size} ${size.label}`}
                  className="p-1 text-mute transition-colors hover:text-burgundy"
                >
                  <CloseIcon className="size-4" />
                </button>
                <div className="relative h-20 w-[60px] shrink-0 overflow-hidden bg-ivory-dark">
                  {cover ? <Image src={mediaUrl(cover.path)} alt="" fill sizes="60px" className="object-cover object-top" /> : null}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-ink">{pick(product, 'name', locale)}</p>
                  <p className="text-sm text-mute">
                    {color ? `${pick(color, 'name', locale)} · ` : ''}
                    {t.product.size} : {size.label}
                  </p>
                  <div className="mt-2">
                    <QuantityStepper
                      value={quantity}
                      max={maxQuantity(size)}
                      onChange={(n) => setQuantity(size.id, n)}
                      label={`${t.product.quantity} — ${t.product.size} ${size.label}`}
                      small
                    />
                  </div>
                </div>
                <p className="whitespace-nowrap text-ink">{formatPrice(product.price_mad * quantity, locale)}</p>
              </li>
              )
            })}
          </ul>

          <dl className="text-[0.9375rem]">
            <div className="flex justify-between border-b border-line py-3.5">
              <dt className="text-ink">{t.checkout.subtotal}</dt>
              <dd className="font-medium text-ink">{formatPrice(cartTotal, locale)}</dd>
            </div>
            <div className="flex justify-between border-b border-line py-3.5">
              <dt className="text-ink">{t.checkout.shipping}</dt>
              <dd className="text-mute">{shipping ? formatPrice(shipping, locale) : t.checkout.free}</dd>
            </div>
            <div className="flex items-baseline justify-between py-4">
              <dt className="text-lg text-ink">{t.checkout.total}</dt>
              <dd className="text-2xl font-medium text-ink">{formatPrice(total, locale)}</dd>
            </div>
          </dl>

          <fieldset>
            <legend className="eyebrow text-gold">{t.checkout.payment}</legend>
            <div role="radiogroup" className="mt-3 grid gap-2">
              {methods.map((m) => (
                <label
                  key={m}
                  className={`flex cursor-pointer items-start gap-3 rounded-[5px] border p-4 transition-colors ${
                    method === m ? 'border-burgundy bg-ivory' : 'border-line bg-white hover:border-burgundy/50'
                  } ${error?.field === 'payment' ? 'border-burgundy' : ''}`}
                >
                  <input
                    type="radio"
                    name="payment"
                    value={m}
                    checked={method === m}
                    onChange={() => {
                      setMethod(m)
                      track('AddPaymentInfo', { value: total, contentId: first.slug })
                    }}
                    className="mt-1 accent-burgundy"
                  />
                  <span>
                    <span className="block text-[0.95rem] text-ink">{t.checkout.methods[m].label}</span>
                    <span className="block text-sm text-mute">{t.checkout.methods[m].hint}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <p className="mt-5 text-sm leading-relaxed text-mute">
            {t.checkout.privacy}{' '}
            <Link href={`/${locale}/confidentialite`} className="text-ink underline underline-offset-2 hover:text-burgundy">
              {t.footer.legal.privacy}
            </Link>
          </p>

          {error ? (
            <p role="alert" className="mt-5 border-s-2 border-burgundy bg-burgundy/5 px-4 py-3 text-sm text-burgundy">
              {t.checkout.errors[error.code]}
            </p>
          ) : null}

          <button type="submit" disabled={pending || methods.length === 0} className={`${primaryButton} mt-5 h-[3.25rem] w-full text-[0.9375rem]`}>
            {pending ? t.checkout.submitting : `${t.checkout.submit} · ${formatPrice(total, locale)}`}
          </button>
          <p className="mt-3 text-center text-xs text-mute">{t.checkout.trust}</p>
        </div>
      </div>
    </form>
  )
}
