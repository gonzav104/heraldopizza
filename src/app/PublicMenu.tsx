import type { ReactNode } from 'react'
import { Storefront } from '@/app/Storefront'
import { StatusScreen } from '@/components/ui/StatusScreen'
import type { CatalogRepository } from '@/domain/catalog'
import { useRefreshableCatalog } from '@/app/useRefreshableCatalog'
import { CatalogRefreshContext } from '@/features/catalog/catalog-refresh'

/** The menu's own notices use the shared status screen, with the role that fits each moment. */
function MenuNotice({ role, children }: { role: 'status' | 'alert'; children: ReactNode }) {
  return (
    <StatusScreen>
      <div role={role} className="flex flex-col items-center gap-4">
        {children}
      </div>
    </StatusScreen>
  )
}

/**
 * Loads the catalog, promotions included, through the repository and shows the menu, or a clear state while it loads,
 * when it fails, or when it is empty. On failure it offers «Reintentar» and never substitutes other data (S6 of U3b):
 * the prototype promotions are never a source for the public menu (P5a). The checkout refreshes it before WhatsApp
 * through CatalogRefreshContext (P6a).
 */
export function PublicMenu({ repository }: { repository: CatalogRepository }) {
  const { state, retry, refreshCatalog } = useRefreshableCatalog(repository)

  if (state.status === 'loading') {
    return (
      <MenuNotice role="status">
        <p className="text-[1.0625rem] font-semibold">Cargando la carta…</p>
      </MenuNotice>
    )
  }

  if (state.status === 'error') {
    return (
      <MenuNotice role="alert">
        <p className="type-display text-[1.5rem]">No pudimos cargar la carta.</p>
        <p className="text-crema-muted">Revisá tu conexión e intentá de nuevo en un momento.</p>
        <button
          type="button"
          onClick={retry}
          className="inline-flex min-h-12 items-center rounded-full bg-heraldo px-6 font-bold text-white transition-colors hover:bg-heraldo-deep"
        >
          Reintentar
        </button>
      </MenuNotice>
    )
  }

  const { categories, products } = state.catalog
  const { promotions } = state.catalog
  if (categories.length === 0) {
    return (
      <MenuNotice role="status">
        <p className="text-[1.0625rem] font-semibold">La carta no está disponible en este momento.</p>
      </MenuNotice>
    )
  }

  return (
    <CatalogRefreshContext value={refreshCatalog}>
      <Storefront categories={categories} products={products} promotions={promotions} />
    </CatalogRefreshContext>
  )
}
