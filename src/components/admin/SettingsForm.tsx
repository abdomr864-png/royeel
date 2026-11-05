'use client'

import { useState, useTransition, type ReactNode } from 'react'
import { saveSettings } from '@/lib/admin/actions'
import { btn, Card, input, Label } from './ui'

export type Integrations = { card: boolean; email: boolean; whatsapp: boolean; sms: boolean; metaCapi: boolean; tiktokEvents: boolean }

type Settings = Record<string, string | number | boolean>

export function SettingsForm({ settings, integrations }: { settings: Settings; integrations: Integrations }) {
  const [pending, start] = useTransition()
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const s = settings
  const whatsappDisplay = typeof s.whatsapp_number === 'string' && s.whatsapp_number.startsWith('212') ? `0${s.whatsapp_number.slice(3)}` : String(s.whatsapp_number ?? '')

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        const fd = new FormData(e.currentTarget)
        start(async () => {
          const res = await saveSettings(fd)
          setMsg(res.ok ? { ok: true, text: res.message ?? 'Enregistré.' } : { ok: false, text: res.error })
          window.scrollTo({ top: 0, behavior: 'smooth' })
        })
      }}
      className="grid gap-4"
    >
      {msg ? (
        <p role="status" className={`rounded-xl px-4 py-3 text-sm ${msg.ok ? 'bg-emerald-50 text-emerald-900' : 'bg-red-50 text-red-800'}`}>
          {msg.text}
        </p>
      ) : null}

      <Card title="Boutique en ligne">
        <div className="grid gap-3">
          <Toggle
            name="coming_soon"
            checked={!!s.coming_soon}
            title="Mode « Bientôt disponible »"
            text="Les visiteurs voient la page « Quelque chose de beau se prépare » avec vos liens Instagram et WhatsApp, au lieu de la collection. Décochez pour ouvrir la boutique."
          />
          <p className="text-sm text-mute">
            Boutique fermée, vous pouvez quand même la voir :{' '}
            <a href="/admin/apercu" target="_blank" rel="noopener" className="font-medium text-burgundy underline underline-offset-2">
              ouvrir l’aperçu de la vraie boutique
            </a>{' '}
            (visible seulement par vous).
          </p>
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card title="Modes de paiement">
          <div className="grid gap-3">
            <Toggle name="cod_enabled" checked={!!s.cod_enabled} title="Paiement à la livraison" text="En espèces, à la réception du colis." />
            <Toggle name="bank_transfer_enabled" checked={!!s.bank_transfer_enabled} title="Virement bancaire" text="Vos coordonnées bancaires s’affichent après la commande." />
            <Toggle
              name="card_enabled"
              checked={!!s.card_enabled}
              disabled={!integrations.card}
              title="Carte bancaire (CMI)"
              text={integrations.card ? 'Paiement sécurisé par CMI.' : 'Disponible quand CMI vous aura donné vos clés (après l’enregistrement de la société).'}
              status={integrations.card}
            />
          </div>
        </Card>

        <Card title="Coordonnées bancaires (virement)">
          <div className="grid gap-3">
            <Text name="bank_name" label="Banque" value={s.bank_name} placeholder="ex. CIH Bank" />
            <Text name="bank_account_holder" label="Titulaire du compte" value={s.bank_account_holder} />
            <Text name="bank_rib" label="RIB (24 chiffres)" value={s.bank_rib} placeholder="000 000 0000000000000000 00" ltr />
          </div>
        </Card>

        <Card title="WhatsApp et contact">
          <div className="grid gap-3">
            <Text name="whatsapp_number" label="Numéro WhatsApp de la boutique" value={whatsappDisplay} placeholder="06 12 34 56 78" ltr />
            <Text name="contact_email" label="E-mail de contact" value={s.contact_email} type="email" ltr />
            <Text name="instagram_url" label="Lien Instagram" value={s.instagram_url} placeholder="https://instagram.com/royeel" ltr />
            <Text name="tiktok_url" label="Lien TikTok" value={s.tiktok_url} placeholder="https://tiktok.com/@royeel" ltr />
            <Text name="facebook_url" label="Lien Facebook" value={s.facebook_url} ltr />
          </div>
        </Card>

        <Card title="Notifications de commande">
          <div className="grid gap-3">
            <Toggle
              name="notify_email_enabled"
              checked={!!s.notify_email_enabled}
              title="E-mail"
              text={integrations.email ? 'Confirmation à la cliente (si elle a donné son e-mail) et alerte pour vous.' : 'Activez-le dès que la clé Resend est ajoutée sur le serveur.'}
              status={integrations.email}
            />
            <Text name="admin_notify_email" label="Recevoir les alertes de commande à" value={s.admin_notify_email} type="email" placeholder="vous@exemple.com" ltr />
            <Toggle
              name="notify_whatsapp_enabled"
              checked={!!s.notify_whatsapp_enabled}
              title="WhatsApp automatique"
              text={integrations.whatsapp ? 'Message avec les boutons « Oui » et « Non » : « Oui » confirme la commande, « Non » l’annule et remet le stock.' : 'Nécessite l’API WhatsApp Business (vérification Meta). En attendant, utilisez les boutons WhatsApp de chaque commande.'}
              status={integrations.whatsapp}
            />
            <Toggle
              name="notify_sms_enabled"
              checked={!!s.notify_sms_enabled}
              title="SMS"
              text={integrations.sms ? 'SMS de confirmation envoyé automatiquement.' : 'Nécessite un compte SMS (Twilio) configuré sur le serveur.'}
              status={integrations.sms}
            />
          </div>
        </Card>

        <Card title="Publicité (Instagram, Facebook, TikTok)">
          <div className="grid gap-3">
            <Text name="meta_pixel_id" label="ID du pixel Meta" value={s.meta_pixel_id} placeholder="ex. 123456789012345" ltr hint="Gestionnaire d’événements Meta" />
            <Text name="tiktok_pixel_id" label="ID du pixel TikTok" value={s.tiktok_pixel_id} placeholder="ex. CABCDEF1234567890" ltr hint="TikTok Ads Manager → Événements" />
            <ul className="grid gap-1 text-xs text-mute">
              <li>
                <Dot ok={integrations.metaCapi} /> Envoi serveur Meta (API Conversions) {integrations.metaCapi ? 'actif' : 'non configuré'}
              </li>
              <li>
                <Dot ok={integrations.tiktokEvents} /> Envoi serveur TikTok (Events API) {integrations.tiktokEvents ? 'actif' : 'non configuré'}
              </li>
            </ul>
          </div>
        </Card>

        <Card title="Livraison">
          <label>
            <Label hint="(0 = offerte)">Frais de livraison (DH)</Label>
            <input name="shipping_fee_mad" type="number" min={0} inputMode="numeric" defaultValue={Number(s.shipping_fee_mad ?? 0)} className={`${input} max-w-40`} />
          </label>
        </Card>
      </div>

      <div className="sticky bottom-4 z-10 flex justify-end">
        <button type="submit" disabled={pending} className={`${btn.primary} h-12 px-8 shadow-lg`}>
          {pending ? 'Enregistrement…' : 'Enregistrer les réglages'}
        </button>
      </div>
    </form>
  )
}

function Toggle({ name, checked, title, text, disabled, status }: { name: string; checked: boolean; title: string; text: string; disabled?: boolean; status?: boolean }) {
  return (
    <label className={`flex items-start gap-3 rounded-xl border border-line/70 px-4 py-3 ${disabled ? 'opacity-60' : 'cursor-pointer hover:border-burgundy/40'}`}>
      <input type="checkbox" name={name} defaultChecked={checked} disabled={disabled} className="mt-1 size-4 accent-burgundy" />
      <span className="text-sm">
        <span className="flex items-center gap-2 font-medium text-ink">
          {title}
          {status !== undefined ? <Dot ok={status} /> : null}
        </span>
        <span className="block text-mute">{text}</span>
      </span>
    </label>
  )
}

function Dot({ ok }: { ok: boolean }) {
  return <span aria-label={ok ? 'configuré' : 'non configuré'} className={`inline-block size-2 rounded-full ${ok ? 'bg-emerald-500' : 'bg-stone-300'}`} />
}

function Text({
  name,
  label,
  value,
  placeholder,
  type = 'text',
  ltr,
  hint,
}: {
  name: string
  label: string
  value: unknown
  placeholder?: string
  type?: string
  ltr?: boolean
  hint?: ReactNode
}) {
  return (
    <label>
      <Label hint={hint}>{label}</Label>
      <input name={name} type={type} defaultValue={String(value ?? '')} placeholder={placeholder} dir={ltr ? 'ltr' : undefined} className={input} />
    </label>
  )
}
