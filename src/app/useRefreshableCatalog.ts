import { useCallback, useEffect, useRef, useState } from 'react'
import type { Catalog, CatalogRepository } from '@/domain/catalog'

export type CatalogLoadState = { status: 'loading' } | { status: 'error' } | { status: 'ready'; catalog: Catalog }

/**
 * Whether a refresh replaced the menu, and with which catalog; `applied: false` when a newer refresh started after it,
 * so its answer was dropped. The caller prices the order against `catalog`, exactly what the menu now shows.
 */
export type RefreshOutcome = { applied: true; catalog: Catalog } | { applied: false }

/**
 * The menu's catalog: loaded once when the page opens (with its loading and error screens and «Reintentar»), and
 * refreshed on request before WhatsApp (P6a). A refresh goes through the same repository load, the two GETs in
 * parallel, with no per-product requests and no polling. It never touches the loading or error screens: a failure, a
 * cancellation, or an empty answer rejects and leaves the menu on screen as it was. Only the newest refresh may
 * replace the catalog, so an older answer arriving late is dropped.
 */
export function useRefreshableCatalog(repository: CatalogRepository) {
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState<CatalogLoadState>({ status: 'loading' })
  const latest = useRef(0)

  useEffect(() => {
    const controller = new AbortController()
    // The promotions arrive in the same load as the menu, so a saved promotion is never judged without them (P2).
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

  const retry = useCallback(() => {
    setState({ status: 'loading' })
    setAttempt((value) => value + 1)
  }, [])

  const refreshCatalog = useCallback(
    async (signal?: AbortSignal): Promise<RefreshOutcome> => {
      const request = ++latest.current
      const catalog = await repository.load(signal)
      if (signal?.aborted) throw signal.reason
      // A menu without categories is never a valid answer here: it would replace the menu with «no disponible».
      if (catalog.categories.length === 0) throw new Error('The refreshed catalog came back empty')
      if (request !== latest.current) return { applied: false }
      setState({ status: 'ready', catalog })
      return { applied: true, catalog }
    },
    [repository],
  )

  return { state, retry, refreshCatalog }
}
