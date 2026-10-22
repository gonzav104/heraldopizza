import { createContext, useContext } from 'react'
import type { RefreshOutcome } from '@/app/useRefreshableCatalog'

/**
 * Asks the menu for a fresh catalog (P6a). Resolves once the menu shows it, or with `applied: false` when a newer
 * refresh superseded it; rejects on a network failure, a cancellation, or an empty answer, leaving the menu as it was.
 */
export type RefreshCatalog = (signal?: AbortSignal) => Promise<RefreshOutcome>

/** Outside the public menu (tests, `#sistema`) there is nothing to refresh: it fails, like an unreachable server. */
const unavailable: RefreshCatalog = () => Promise.reject(new Error('The catalog cannot be refreshed here'))

export const CatalogRefreshContext = createContext<RefreshCatalog>(unavailable)

export function useRefreshCatalog(): RefreshCatalog {
  return useContext(CatalogRefreshContext)
}
