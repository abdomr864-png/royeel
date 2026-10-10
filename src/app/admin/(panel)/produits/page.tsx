/* eslint-disable @next/next/no-img-element -- admin thumbnails of uploaded files */
import Link from 'next/link'
import { MoveProduct, NewProductForm } from '@/components/admin/ProductsAdmin'
import { ShowcaseManager } from '@/components/admin/ShowcaseManager'
import { Card, Empty, PageHeader } from '@/components/admin/ui'
import { requireAdmin } from '@/lib/admin/auth'
import { formatPrice } from '@/lib/format'
import { mediaUrl } from '@/lib/supabase/env'
import type { ShowcasePiece } from '@/lib/types'

export const metadata = { title: 'Produits' }

// Checks the session on the server first, so navigating here waits for it.
export const instant = false

type Row = {
  id: string
  name_fr: string
  price_mad: number
  is_published: boolean
  product_images: { path: string; role: string; position: number }[]
  product_sizes: { stock: number; is_active: boolean }[]
  product_colors: { hex: string; position: number }[]
}

export default async function ProductsPage() {
  const { supabase } = await requireAdmin()
  const [{ data }, { data: showcase }] = await Promise.all([
    supabase
      .from('products')
      .select('id, name_fr, price_mad, is_published, product_images(path, role, position), product_sizes(stock, is_active), product_colors(hex, position)')
      .order('position')
      .order('created_at'),
    supabase.from('showcase_pieces').select('*').order('position'),
  ])
  const products = (data ?? []) as Row[]
  const pieces = (showcase ?? []) as ShowcasePiece[]
  const online = products.filter((p) => p.is_published).length

  return (
    <>
      <PageHeader
        title="Produits"
        subtitle={`${products.length} produit${products.length > 1 ? 's' : ''} · ${online} en ligne`}
        actions={
          <a href="/" target="_blank" className={`inline-flex h-10 items-center rounded-lg border border-line bg-white px-4 text-sm hover:border-burgundy/50`}>
            Voir la boutique ↗
          </a>
        }
      />
      <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <Card title="Vos produits">
          {products.length === 0 ? (
            <Empty>Aucun produit pour l’instant. Créez le premier avec le formulaire.</Empty>
          ) : (
            <ul className="divide-y divide-line/60">
              {products.map((p, i) => {
                const cover = [...p.product_images].sort((a, b) => (a.role === b.role ? a.position - b.position : a.role === 'gallery' ? -1 : 1))[0]
                const stock = p.product_sizes.filter((s) => s.is_active).reduce((n, s) => n + s.stock, 0)
                const colors = [...p.product_colors].sort((a, b) => a.position - b.position)
                return (
                  <li key={p.id} className="flex items-center gap-3 py-3">
                    <MoveProduct productId={p.id} first={i === 0} last={i === products.length - 1} />
                    <Link href={`/admin/produits/${p.id}`} className="flex min-w-0 flex-1 items-center gap-3 rounded-lg p-1 hover:bg-[#faf7f2]">
                      <span className="h-16 w-12 shrink-0 overflow-hidden rounded-md bg-[#efe7dc]">
                        {cover ? <img src={mediaUrl(cover.path)} alt="" className="size-full object-cover" /> : null}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-ink">{p.name_fr}</span>
                        <span className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-mute">
                          <span className="tabular-nums">{formatPrice(p.price_mad, 'fr')}</span>
                          <span className={stock === 0 ? 'text-red-700' : ''}>
                            {stock === 0 ? 'Rupture de stock' : `${stock} en stock`}
                          </span>
                          {colors.length ? (
                            <span className="flex gap-1">
                              {colors.map((c, j) => (
                                <span key={j} className="size-3 rounded-full border border-ink/15" style={{ background: c.hex }} />
                              ))}
                            </span>
                          ) : null}
                        </span>
                      </span>
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${
                          p.is_published ? 'bg-emerald-50 text-emerald-800 ring-emerald-200' : 'bg-stone-100 text-stone-600 ring-stone-200'
                        }`}
                      >
                        {p.is_published ? 'En ligne' : 'Hors ligne'}
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
          {products.length > 1 ? <p className="mt-3 text-xs text-mute">Les flèches changent l’ordre sur la boutique. Le premier produit est celui du bandeau d’accueil.</p> : null}
        </Card>
        <Card title="Nouveau produit">
          <NewProductForm />
        </Card>
      </div>
      <Card title="Vitrine : pièces en rupture" className="mt-4">
        <ShowcaseManager key={JSON.stringify(pieces)} pieces={pieces} />
      </Card>
    </>
  )
}
