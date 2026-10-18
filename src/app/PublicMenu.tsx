import { useEffect, useState, type ReactNode } from 'react'
import { Storefront } from '@/app/Storefront'
import { StatusScreen } from '@/components/ui/StatusScreen'
import { loadDevPromotions } from '@/data/dev-promotions'
import type { Catalog, CatalogRepository, Promotion } from '@/domain/catalog'

type LoadState = { status: 'loading' } | { status: 'error' } | { status: 'ready'; catalog: Catalog }

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
 * Loads the catalog through the repository and shows the menu, or a clear state while it loads, when it fails, or
 * when it is empty. On failure it offers «Reintentar» and never substitutes other data (S6 of U3b).
 */
export function PublicMenu({
  repository,
  loadPromotions = loadDevPromotions,
}: {
  repository: CatalogRepository
  /** Promotions to show while the catalog source has none: prototype data in development, none in production (U9). */
  loadPromotions?: () => Promise<Promotion[]>
}) {
  const [extraPromotions, setExtraPromotions] = useState<Promotion[]>([])

  useEffect(() => {
    let active = true
    loadPromotions().then(
      (promotions) => {
        if (active) setExtraPromotions(promotions)
      },
      () => undefined,
    )
    return () => {
      active = false
    }
  }, [loadPromotions])

  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState<LoadState>({ status: 'loading' })

  useEffect(() => {
    const controller = new AbortController()
    repository.load(controller.signal).then(
      (catalog) => {
        if (!controller.signal.aborted) setState({ status: 'ready', catalog })
      },
      (error: unknown) => {
        if (controller.signal.aborted) return
        console.error('The menu could not be loaded', error)
        setState({ status: 'error' })
      },
    )
    return () => controller.abort()
  }, [repository, attempt])

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
  const promotions = state.catalog.promotions.length > 0 ? state.catalog.promotions : extraPromotions
  if (categories.length === 0) {
    return (
      <MenuNotice role="status">
        <p className="text-[1.0625rem] font-semibold">La carta no está disponible en este momento.</p>
      </MenuNotice>
    )
  }

  return <Storefront categories={categories} products={products} promotions={promotions} />
}
