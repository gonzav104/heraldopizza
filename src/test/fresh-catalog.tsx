import type { ReactNode } from 'react'
import type { Catalog } from '@/domain/catalog'
import { CatalogRefreshContext } from '@/features/catalog/catalog-refresh'

/**
 * Test wrapper: the final check before WhatsApp (P6a) refreshes the catalog. Tests that render the storefront on its
 * own answer that refresh with the same catalog, so the order is checked and the message step opens.
 */
export function SameCatalogOnRefresh({ catalog, children }: { catalog: Catalog; children: ReactNode }) {
  return <CatalogRefreshContext value={async () => ({ applied: true, catalog })}>{children}</CatalogRefreshContext>
}
