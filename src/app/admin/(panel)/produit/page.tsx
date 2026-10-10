import { redirect } from 'next/navigation'

// The single-product page became the products list.
export default function OldProductPage() {
  redirect('/admin/produits')
}
