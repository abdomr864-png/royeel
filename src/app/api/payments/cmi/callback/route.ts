import { cmiConfigured, verifyCmiHash } from '@/lib/payments/cmi'
import { createServiceClient, isServiceConfigured } from '@/lib/supabase/service'

// Server-to-server notification from CMI. The answer tells CMI what to do:
// "ACTION=POSTAUTH" captures the pre-authorised amount.
export async function POST(request: Request) {
  if (!cmiConfigured || !isServiceConfigured) return text('FAILURE')
  const params = Object.fromEntries(
    [...(await request.formData()).entries()].map(([k, v]) => [k, String(v)]),
  )
  if (!verifyCmiHash(params)) return text('FAILURE')

  const supabase = createServiceClient()
  const { data: order } = await supabase
    .from('orders')
    .select('id, total_mad, payment_status')
    .eq('order_number', Number(params.oid))
    .single()
  if (!order) return text('FAILURE')

  const approved = params.ProcReturnCode === '00' && Math.abs(Number(params.amount) - order.total_mad) < 0.01
  if (order.payment_status !== 'paid') {
    await supabase
      .from('orders')
      .update({ payment_status: approved ? 'paid' : 'failed', payment_ref: params.TransId ?? null })
      .eq('id', order.id)
    await supabase.from('order_events').insert({
      order_id: order.id,
      kind: 'payment',
      message: approved ? 'Paiement carte accepté (CMI)' : `Paiement carte refusé (CMI ${params.ProcReturnCode ?? ''})`,
      data: { trans_id: params.TransId ?? null, code: params.ProcReturnCode ?? null, response: params.Response ?? null },
    })
  }
  return text(approved ? 'ACTION=POSTAUTH' : 'APPROVED')
}

function text(body: string) {
  return new Response(body, { headers: { 'Content-Type': 'text/plain' } })
}
