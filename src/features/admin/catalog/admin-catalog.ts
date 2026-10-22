import type { Ars } from '@/domain/catalog'

export { AdminSaveError, type SaveFailure } from '@/features/admin/shared/admin-save'

/**
 * The catalog as the admin panel edits it (U5). Every row carries `updatedAt`, the token read from the database: a save
 * sends it back and is refused if the row changed in the meantime (optimistic lock). Tokens are kept as the exact text
 * the database returned, never parsed into a Date, so their microseconds survive the round trip.
 */
export interface AdminVariant {
  id: string
  /** Read-only: pricing depends on «Entera» and «Media». */
  name: string
  /** Whole pesos, or null for «Consultar en barra». */
  price: Ars | null
  updatedAt: string
}

export interface AdminProduct {
  id: string
  categoryId: string
  name: string
  description: string | null
  madeToOrder: boolean
  madeToOrderNotice: string | null
  outOfStock: boolean
  visible: boolean
  updatedAt: string
  variants: AdminVariant[]
}

export interface AdminCategory {
  id: string
  name: string
  visible: boolean
  updatedAt: string
  products: AdminProduct[]
}

/** The only category fields the panel may change (S2). */
export interface CategoryChanges {
  name?: string
  visible?: boolean
}

/** The only product fields the panel may change (S2). */
export interface ProductChanges {
  name?: string
  description?: string | null
  madeToOrder?: boolean
  madeToOrderNotice?: string | null
  outOfStock?: boolean
  visible?: boolean
}

export interface PriceChange {
  variantId: string
  price: Ars | null
  /** The token read with the variant. */
  updatedAt: string
}

/** Port between the panel and the catalog storage. Each save returns the row as the database now holds it. */
export interface AdminCatalogRepository {
  load(): Promise<AdminCategory[]>
  updateCategory(id: string, changes: CategoryChanges, updatedAt: string): Promise<Omit<AdminCategory, 'products'>>
  updateProduct(id: string, changes: ProductChanges, updatedAt: string): Promise<Omit<AdminProduct, 'variants'>>
  /** All of a product's price changes in one transaction: all saved or none. */
  updatePrices(productId: string, changes: PriceChange[]): Promise<Pick<AdminVariant, 'id' | 'price' | 'updatedAt'>[]>
}
