import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ImagesManager } from '@/components/admin/ImagesManager'
import { ModelUploader } from '@/components/admin/ModelUploader'
import { ProductForm } from '@/components/admin/ProductForm'
import { DeleteProduct } from '@/components/admin/ProductsAdmin'
import { Card, PageHeader } from '@/components/admin/ui'
import { VariantsEditor } from '@/components/admin/VariantsEditor'
import { requireAdmin } from '@/lib/admin/auth'
import type { Product } from '@/lib/types'

export const metadata = { title: 'Produit' }

// Checks the session on the server first, so navigating here waits for it.
export const instant = false

const linkButton = 'inline-flex h-10 items-center rounded-lg border border-line bg-white px-4 text-sm hover:border-burgundy/50'

export default async function ProductPage({ params }: PageProps<'/admin/produits/[id]'>) {
  const { supabase } = await requireAdmin()
  const { id } = await params
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound()

  const { data } = await supabase.from('products').select('*, product_images(*), product_sizes(*), product_colors(*)').eq('id', id).single()
  if (!data) notFound()
  const product = data as Product
  product.product_images.sort((a, b) => a.position - b.position)
  product.product_sizes.sort((a, b) => a.position - b.position)
  product.product_colors.sort((a, b) => a.position - b.position)
  const totalStock = product.product_sizes.filter((s) => s.is_active).reduce((n, s) => n + s.stock, 0)

  return (
    <>
      <Link href="/admin/produits" className="mb-3 inline-block text-sm text-mute hover:text-ink">
        ← Tous les produits
      </Link>
      <PageHeader
        title={product.name_fr}
        subtitle={
          <>
            {product.is_published ? 'En ligne' : 'Hors ligne'} · {totalStock} pièce{totalStock > 1 ? 's' : ''} en stock
          </>
        }
        actions={
          product.is_published ? (
            <a href={`/fr/produit/${product.slug}`} target="_blank" className={linkButton}>
              Voir sur la boutique ↗
            </a>
          ) : null
        }
      />
      <Card title="Couleurs, tailles et stock" className="mb-4">
        {/* Remount after each save so new rows pick up their database ids. */}
        <VariantsEditor
          key={JSON.stringify([product.product_colors, product.product_sizes])}
          productId={product.id}
          colors={product.product_colors}
          sizes={product.product_sizes}
        />
      </Card>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <div className="grid content-start gap-4">
          <Card title="Informations">
            <ProductForm key={product.id} product={product} />
          </Card>
        </div>
        <div className="grid content-start gap-4">
          <Card title="Photos">
            <ImagesManager key={JSON.stringify([product.product_images, product.product_colors])} productId={product.id} images={product.product_images} colors={product.product_colors} />
          </Card>
          <Card title="Modèle 3D">
            <ModelUploader productId={product.id} path={product.model_3d_path} />
          </Card>
          <Card title="Zone sensible">
            <DeleteProduct productId={product.id} name={product.name_fr} />
            <p className="mt-2 text-xs text-mute">Pour cacher un produit sans le supprimer, décochez « En ligne » dans Informations.</p>
          </Card>
        </div>
      </div>
    </>
  )
}
