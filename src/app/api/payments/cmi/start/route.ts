import { CMI_GATEWAY_URL, cmiConfigured, cmiPaymentFields } from '@/lib/payments/cmi'
import { createServiceClient, isServiceConfigured } from '@/lib/supabase/service'

// Sends the customer to CMI's payment page with a signed, auto-submitting form.
export async function GET(request: Request) {
  const url = new URL(request.url)
  const orderId = url.searchParams.get('order') ?? ''
  if (!cmiConfigured || !isServiceConfigured || !/^[0-9a-f-]{36}$/i.test(orderId)) {
    return new Response('Paiement indisponible', { status: 400 })
  }

  const { data: order } = await createServiceClient()
    .from('orders')
    .select('id, order_number, total_mad, full_name, email, phone, locale, payment_method, payment_status')
    .eq('id', orderId)
    .single()
  if (!order || order.payment_method !== 'card') return new Response('Commande introuvable', { status: 404 })
  if (order.payment_status === 'paid') {
    return Response.redirect(new URL(`/${order.locale}/merci/${order.id}`, url), 303)
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || url.origin
  const fields = cmiPaymentFields({
    orderNumber: order.order_number,
    totalMad: order.total_mad,
    fullName: order.full_name,
    email: order.email,
    phone: order.phone,
    locale: order.locale,
    siteUrl,
  })
  const inputs = Object.entries(fields)
    .map(([k, v]) => `<input type="hidden" name="${esc(k)}" value="${esc(v)}">`)
    .join('')

  return new Response(
    `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Royeel — Paiement</title></head>
<body style="margin:0;display:grid;place-items:center;min-height:100vh;background:#4d131c;color:#f3ece3;font-family:Georgia,serif">
<form id="f" method="post" action="${esc(CMI_GATEWAY_URL)}">${inputs}<noscript><button type="submit">Continuer vers le paiement</button></noscript></form>
<p>Redirection vers le paiement sécurisé…</p>
<script>document.getElementById('f').submit()</script>
</body></html>`,
    { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } },
  )
}

function esc(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
}
