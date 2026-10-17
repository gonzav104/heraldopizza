import type { Catalog, CatalogRepository } from '@/domain/catalog'
import { prototypeCategories, prototypeProducts } from '@/data/prototype-catalog'

/**
 * The seed fixture behind the CatalogRepository port, for tests only (the `#sistema` reference view reads the same
 * fixture directly). It is never a fallback for the public menu: stale prices must not reach a customer.
 */
export class FixtureCatalogRepository implements CatalogRepository {
  load(): Promise<Catalog> {
    return Promise.resolve({ categories: prototypeCategories, products: prototypeProducts, promotions: [] })
  }
}
