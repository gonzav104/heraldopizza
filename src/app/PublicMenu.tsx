import { useEffect, useState, type ReactNode } from 'react'
import { Storefront } from '@/app/Storefront'
import type { Catalog, CatalogRepository } from '@/domain/catalog'

type LoadState = { status: 'loading' } | { status: 'error' } | { status: 'ready'; catalog: Catalog }

/** Full-screen notice on the black sheet, with the logo, for the moments the menu itself cannot show. */
function MenuNotice({ role, children }: { role: 'status' | 'alert'; children: ReactNode }) {
  return (
    <main className="texture-chapa grid min-h-dvh place-items-center px-4">
      <div role={role} className="flex max-w-sm flex-col items-center gap-4 text-center">
        <span className="texture-pino size-20 rounded-full p-[3px] shadow-[0_10px_22px_-6px_rgb(0_0_0/0.9)]">
          <span className="grid size-full place-items-center rounded-full bg-chapa">
            <img src="/images/logo-heraldo-pizza.webp" alt="" width={80} height={80} className="size-[88%]" />
          </span>
        </span>
        {children}
      </div>
    </main>
  )
}

/**
 * Loads the catalog through the repository and shows the menu, or a clear state while it loads, when it fails, or
 * when it is empty. On failure it offers «Reintentar» and never substitutes other data (S6 of U3b).
 */
export function PublicMenu({ repository }: { repository: CatalogRepository }) {
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

  const { categories, products, promotions } = state.catalog
  if (categories.length === 0) {
    return (
      <MenuNotice role="status">
        <p className="text-[1.0625rem] font-semibold">La carta no está disponible en este momento.</p>
      </MenuNotice>
    )
  }

  return <Storefront categories={categories} products={products} promotions={promotions} />
}
