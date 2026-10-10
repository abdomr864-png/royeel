import { createServiceClient, isServiceConfigured } from '@/lib/supabase/service'

// CMI sends the customer back here (POST) after paying; we forward them to the
// thank-you page, which reads the real payment status saved by the callback.
export async function POST(request: Request) {
  const url = new URL(request.url)
  const form = await request.formData()
  const oid = Number(form.get('oid'))
  if (!isServiceConfigured || !oid) return Response.redirect(new URL('/', url), 303)

  const { data: order } = await createServiceClient()
    .from('orders')
    .select('id, locale')
    .eq('order_number', oid)
    .single()
  if (!order) return Response.redirect(new URL('/', url), 303)
  return Response.redirect(new URL(`/${order.locale}/merci/${order.id}`, url), 303)
}
