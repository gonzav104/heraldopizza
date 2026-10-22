import { useEffect, useState, type ReactNode } from 'react'
import { Storefront } from '@/app/Storefront'
import { StatusScreen } from '@/components/ui/StatusScreen'
import { loadDevPromotions } from '@/data/dev-promotions'
import type { Catalog, CatalogRepository, Promotion } from '@/domain/catalog'

type LoadState = { status: 'loading' } | { status: 'error' } | { status: 'ready'; catalog: Catalog; extraPromotions: Promotion[] }

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
 * Loads the catalog through the repository, and the extra promotions, and shows the menu, or a clear state while they
 * load, when either fails, or when the catalog is empty. On failure it offers «Reintentar» and never substitutes other
 * data (S6 of U3b).
 */
export function PublicMenu({
  repository,
  loadPromotions = loadDevPromotions,
}: {
  repository: CatalogRepository
  /** Promotions to show while the catalog source has none: prototype data in development, none in production (U9). */
  loadPromotions?: () => Promise<Promotion[]>
}) {
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState<LoadState>({ status: 'loading' })

  useEffect(() => {
    const controller = new AbortController()
    // Both loads run in parallel, and the menu waits for both: a saved promotion is never judged against a catalog
    // whose promotions have not arrived yet (P2). An empty list is a valid answer; a failure is an error, never "none".
    Promise.all([repository.load(controller.signal), loadPromotions()]).then(
      ([catalog, extraPromotions]) => {
        if (!controller.signal.aborted) setState({ status: 'ready', catalog, extraPromotions })
      },
      (error: unknown) => {
        if (controller.signal.aborted) return
        console.error('The menu could not be loaded', error)
        setState({ status: 'error' })
      },
    )
    return () => controller.abort()
  }, [repository, loadPromotions, attempt])

  const retry = () => {
    setState({ status: 'loading' })
    setAttempt((value) => value + 1)
  }

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
  const promotions = state.catalog.promotions.length > 0 ? state.catalog.promotions : state.extraPromotions
  if (categories.length === 0) {
    return (
      <MenuNotice role="status">
        <p className="text-[1.0625rem] font-semibold">La carta no está disponible en este momento.</p>
      </MenuNotice>
    )
  }

  return <Storefront categories={categories} products={products} promotions={promotions} />
}
