import 'server-only'
import { createHash, timingSafeEqual } from 'node:crypto'

// CMI (Centre Monétique Interbancaire) "3D Pay Hosting": the customer is sent
// to CMI's payment page with a signed form, CMI calls our callback server to
// server, then sends the customer back to okUrl / failUrl.
// Test with CMI's sandbox credentials before switching card payment on.

const CLIENT_ID = process.env.CMI_CLIENT_ID ?? ''
const STORE_KEY = process.env.CMI_STORE_KEY ?? ''
export const CMI_GATEWAY_URL = process.env.CMI_GATEWAY_URL ?? 'https://testpayment.cmi.co.ma/fim/est3Dgate'

export const cmiConfigured = Boolean(CLIENT_ID && STORE_KEY)

const escapeValue = (v: string) => v.replace(/\\/g, '\\\\').replace(/\|/g, '\\|')

// Hash version 3: values sorted by parameter name (case-insensitive), escaped,
// joined with "|", followed by the store key; SHA-512, base64.
export function cmiHash(params: Record<string, string>) {
  const keys = Object.keys(params)
    .filter((k) => !['hash', 'encoding'].includes(k.toLowerCase()))
    .sort((a, b) => {
      const x = a.toLowerCase()
      const y = b.toLowerCase()
      return x < y ? -1 : x > y ? 1 : 0
    })
  const plain = keys.map((k) => escapeValue((params[k] ?? '').trim())).join('|') + '|' + escapeValue(STORE_KEY)
  return createHash('sha512').update(plain, 'utf8').digest('base64')
}

export function verifyCmiHash(params: Record<string, string>) {
  const received = params.HASH ?? params.hash ?? ''
  const { HASH: _h, hash: _h2, ...rest } = params
  void _h
  void _h2
  const expected = cmiHash(rest)
  const a = Buffer.from(received)
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}

export function cmiPaymentFields(order: {
  orderNumber: number
  totalMad: number
  fullName: string
  email: string | null
  phone: string
  locale: 'fr' | 'ar'
  siteUrl: string
}) {
  const fields: Record<string, string> = {
    clientid: CLIENT_ID,
    storetype: '3D_PAY_HOSTING',
    hashAlgorithm: 'ver3',
    TranType: 'PreAuth',
    currency: '504',
    amount: order.totalMad.toFixed(2),
    oid: String(order.orderNumber),
    okUrl: `${order.siteUrl}/api/payments/cmi/return?result=ok`,
    failUrl: `${order.siteUrl}/api/payments/cmi/return?result=fail`,
    callbackUrl: `${order.siteUrl}/api/payments/cmi/callback`,
    shopurl: order.siteUrl,
    lang: order.locale === 'ar' ? 'ar' : 'fr',
    rnd: String(Date.now()),
    BillToName: order.fullName,
    email: order.email ?? '',
    tel: order.phone,
    encoding: 'UTF-8',
    AutoRedirect: 'true',
  }
  fields.HASH = cmiHash(fields)
  return fields
}
