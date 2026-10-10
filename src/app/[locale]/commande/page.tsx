import type { Metadata } from 'next'
import { getDictionary } from '@/lib/i18n/get-dictionary'
import { Checkout, CheckoutSteps } from '@/components/store/Checkout'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getDictionary()
  return { title: t.checkout.steps.payment, robots: { index: false } }
}

export default function CheckoutPage() {
  return (
    <main>
      <CheckoutSteps step="payment" />
      <Checkout />
    </main>
  )
}
