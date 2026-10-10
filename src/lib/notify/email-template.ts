import 'server-only'
import { formatPrice, orderRef, whatsappLink } from '@/lib/format'
import { dictionaryFor } from '@/lib/i18n/dictionaries'
import type { Locale } from '@/lib/i18n/config'
import type { PaymentMethod } from '@/lib/types'

type EmailOrder = {
  id: string
  order_number: number
  full_name: string
  city: string
  address: string
  payment_method: PaymentMethod
  total_mad: number
  shipping_mad: number
  order_items: { product_name: string; size_label: string; color_name: string; quantity: number; unit_price_mad: number }[]
}

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

// Order confirmation e-mail in the customer's language, in the brand colours.
export function orderEmailHtml({
  order,
  locale,
  bank,
  whatsappNumber,
  siteUrl,
}: {
  order: EmailOrder
  locale: Locale
  bank: { bank_name: string; bank_account_holder: string; bank_rib: string } | null
  whatsappNumber: string
  siteUrl: string
}) {
  const t = dictionaryFor(locale)
  const dir = locale === 'ar' ? 'rtl' : 'ltr'
  const align = locale === 'ar' ? 'right' : 'left'
  const ref = orderRef(order.order_number)
  const rows = order.order_items
    .map(
      (i) => `<tr>
  <td style="padding:10px 0;border-bottom:1px solid #e6dccf;text-align:${align}">${esc(i.product_name)}${i.color_name ? ` · ${esc(i.color_name)}` : ''} — ${t.checkout.size} ${esc(i.size_label)} × ${i.quantity}</td>
  <td style="padding:10px 0;border-bottom:1px solid #e6dccf;text-align:${locale === 'ar' ? 'left' : 'right'};white-space:nowrap">${formatPrice(i.unit_price_mad * i.quantity, locale)}</td>
</tr>`,
    )
    .join('')
  const steps = t.thanks.steps[order.payment_method].map((s) => `<li style="margin:0 0 6px">${esc(s)}</li>`).join('')
  const bankBlock = bank
    ? `<div style="margin:24px 0;padding:16px 20px;background:#f3ece3">
  <p style="margin:0 0 8px;font-weight:bold">${t.thanks.bank.title}</p>
  <p style="margin:0">${t.thanks.bank.name} : ${esc(bank.bank_name)}<br>${t.thanks.bank.holder} : ${esc(bank.bank_account_holder)}<br>${t.thanks.bank.rib} : <span style="font-family:monospace">${esc(bank.bank_rib)}</span><br>${t.thanks.bank.amount} : ${formatPrice(order.total_mad, locale)}</p>
</div>`
    : ''
  const whatsapp = whatsappNumber
    ? `<p style="margin:24px 0 0"><a href="${whatsappLink(whatsappNumber, t.thanks.whatsappMessage(ref))}" style="color:#4d131c">${t.thanks.contact}</a></p>`
    : ''
  const logo = siteUrl ? `<img src="${siteUrl}/brand/logo-email.png" alt="Royeel" width="140" style="display:block;margin:0 auto">` : '<div style="font-family:Georgia,serif;font-size:28px;letter-spacing:6px;color:#f3ece3">ROYEEL</div>'

  return `<!doctype html>
<html lang="${locale}" dir="${dir}">
<body style="margin:0;background:#faf6f0;font-family:Helvetica,Arial,sans-serif;color:#2a1418">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#faf6f0">
    <tr><td align="center" style="padding:24px 12px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff">
        <tr><td align="center" style="background:#4d131c;padding:32px 24px">${logo}</td></tr>
        <tr><td style="padding:32px 28px;text-align:${align}" dir="${dir}">
          <h1 style="margin:0;font-family:Georgia,serif;font-weight:normal;font-size:30px;color:#4d131c">${t.thanks.title}</h1>
          <p style="margin:8px 0 0;font-size:15px">${esc(t.thanks.subtitle(order.full_name.split(' ')[0]))}</p>
          <p style="margin:16px 0 0;font-size:13px;letter-spacing:2px;color:#b8975a">${t.thanks.number} ${ref}</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;font-size:14px">
            ${rows}
            <tr><td style="padding:10px 0;text-align:${align}">${t.checkout.shipping}</td><td style="padding:10px 0;text-align:${locale === 'ar' ? 'left' : 'right'}">${order.shipping_mad ? formatPrice(order.shipping_mad, locale) : t.checkout.free}</td></tr>
            <tr><td style="padding:10px 0;font-weight:bold;text-align:${align}">${t.checkout.total}</td><td style="padding:10px 0;font-weight:bold;text-align:${locale === 'ar' ? 'left' : 'right'}">${formatPrice(order.total_mad, locale)}</td></tr>
          </table>
          <p style="margin:24px 0 8px;font-weight:bold">${t.thanks.next}</p>
          <ol style="margin:0;padding-${align}:20px;font-size:14px;line-height:1.5">${steps}</ol>
          ${bankBlock}
          <p style="margin:24px 0 0;font-size:13px;color:#76635f">${esc(order.address)}, ${esc(order.city)}</p>
          ${whatsapp}
        </td></tr>
        <tr><td align="center" style="padding:20px;font-size:12px;color:#76635f;border-top:1px solid #e6dccf">Royeel — Uniquely yours.</td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}
