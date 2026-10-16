import { createContext, useContext } from 'react'
import type { Category, Product, Promotion } from '@/domain/catalog'
import { indexCatalog, type CatalogIndex } from '@/features/cart/line-pricing'

export interface CatalogData {
  categories: Category[]
  products: Product[]
  promotions: Promotion[]
  index: CatalogIndex
}

export function createCatalogData(categories: Category[], products: Product[], promotions: Promotion[]): CatalogData {
  return { categories, products, promotions, index: indexCatalog(categories, products, promotions) }
}

/** The catalog the order is priced against. U1 replaces the fixture behind it with the typed data adapter. */
export const CatalogContext = createContext<CatalogData | null>(null)

export function useCatalog(): CatalogData {
  const catalog = useContext(CatalogContext)
  if (!catalog) throw new Error('useCatalog must be used inside <CatalogContext>')
  return catalog
}
