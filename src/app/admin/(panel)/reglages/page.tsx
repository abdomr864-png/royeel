import { SettingsForm, type Integrations } from '@/components/admin/SettingsForm'
import { PageHeader } from '@/components/admin/ui'
import { requireAdmin } from '@/lib/admin/auth'
import { channelsConfigured } from '@/lib/notify'
import { cmiConfigured } from '@/lib/payments/cmi'

export const metadata = { title: 'Réglages' }

// Checks the session on the server first, so navigating here waits for it.
export const instant = false

export default async function SettingsPage() {
  const { supabase } = await requireAdmin()
  const { data: settings, error } = await supabase.from('store_settings').select('*').single()
  if (error || !settings) throw new Error(error?.message ?? 'Réglages introuvables')

  // Which services have their keys on the server (set in Netlify, not here).
  const integrations: Integrations = {
    card: cmiConfigured,
    email: channelsConfigured.email,
    whatsapp: channelsConfigured.whatsapp,
    sms: channelsConfigured.sms,
    metaCapi: Boolean(process.env.META_CAPI_TOKEN),
    tiktokEvents: Boolean(process.env.TIKTOK_EVENTS_TOKEN),
  }

  return (
    <>
      <PageHeader title="Réglages" subtitle="Paiements, notifications, publicité et liens. Chaque changement s’applique tout de suite à la boutique." />
      <SettingsForm settings={settings} integrations={integrations} />
    </>
  )
}
