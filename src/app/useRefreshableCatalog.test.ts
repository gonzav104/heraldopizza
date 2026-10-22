import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Catalog, CatalogRepository } from '@/domain/catalog'
import { prototypeCategories, prototypeProducts } from '@/data/prototype-catalog'
import { useRefreshableCatalog } from '@/app/useRefreshableCatalog'

// P6a-1: the menu loads once, and the checkout can ask for a fresh copy before WhatsApp. A refresh reuses the
// repository's single load (two GETs in parallel), never shows the global error screen, and never lets an older
// answer replace a newer one.

const catalogA: Catalog = { categories: prototypeCategories, products: prototypeProducts, promotions: [] }
const catalogB: Catalog = { ...catalogA, products: prototypeProducts.slice(1) }
const catalogC: Catalog = { ...catalogA, products: prototypeProducts.slice(2) }

interface Pending {
  resolve: (catalog: Catalog) => void
  reject: (error: unknown) => void
  signal?: AbortSignal
}

function controlledRepository() {
  const calls: Pending[] = []
  const repository: CatalogRepository = {
    load: vi.fn(
      (signal?: AbortSignal) =>
        new Promise<Catalog>((resolve, reject) => {
          calls.push({ resolve, reject, signal })
          signal?.addEventListener('abort', () => reject(signal.reason), { once: true })
        }),
    ),
  }
  return { repository, calls }
}

async function loaded() {
  const { repository, calls } = controlledRepository()
  const hook = renderHook(() => useRefreshableCatalog(repository))
  await act(async () => calls[0].resolve(catalogA))
  expect(hook.result.current.state).toEqual({ status: 'ready', catalog: catalogA })
  return { ...hook, repository, calls }
}

describe('useRefreshableCatalog (P6a-1)', () => {
  it('replaces the catalog with a fresh one through a single repository load', async () => {
    const { result, repository, calls } = await loaded()
    let outcome: unknown
    await act(async () => {
      const refresh = result.current.refreshCatalog()
      calls[1].resolve(catalogB)
      outcome = await refresh
    })
    expect(outcome).toEqual({ applied: true })
    expect(repository.load).toHaveBeenCalledTimes(2)
    expect(result.current.state).toEqual({ status: 'ready', catalog: catalogB })
  })

  it('keeps the current catalog and never shows the error screen when a refresh fails', async () => {
    const { result, calls } = await loaded()
    let failure: unknown
    await act(async () => {
      const refresh = result.current.refreshCatalog().catch((error: unknown) => (failure = error))
      calls[1].reject(new TypeError('Failed to fetch'))
      await refresh
    })
    expect(failure).toBeInstanceOf(TypeError)
    expect(result.current.state).toEqual({ status: 'ready', catalog: catalogA })
  })

  it('never takes an empty answer for the menu: it fails and keeps what is on screen', async () => {
    const { result, calls } = await loaded()
    let failure: unknown
    await act(async () => {
      const refresh = result.current.refreshCatalog().catch((error: unknown) => (failure = error))
      calls[1].resolve({ categories: [], products: [], promotions: [] })
      await refresh
    })
    expect(failure).toBeInstanceOf(Error)
    expect(result.current.state).toEqual({ status: 'ready', catalog: catalogA })
  })

  it('applies only the newest refresh when two answer in reverse order', async () => {
    const { result, calls } = await loaded()
    const outcomes: unknown[] = []
    await act(async () => {
      const older = result.current.refreshCatalog().then((value) => outcomes.push(['older', value]))
      const newer = result.current.refreshCatalog().then((value) => outcomes.push(['newer', value]))
      calls[2].resolve(catalogC)
      await newer
      calls[1].resolve(catalogB)
      await older
    })
    expect(result.current.state).toEqual({ status: 'ready', catalog: catalogC })
    expect(outcomes).toEqual([
      ['newer', { applied: true }],
      ['older', { applied: false }],
    ])
  })

  it('passes the caller\'s signal down, and a cancelled refresh changes nothing', async () => {
    const { result, calls } = await loaded()
    const controller = new AbortController()
    let failure: unknown
    await act(async () => {
      const refresh = result.current.refreshCatalog(controller.signal).catch((error: unknown) => (failure = error))
      expect(calls[1].signal).toBe(controller.signal)
      controller.abort(new DOMException('closed', 'AbortError'))
      await refresh
    })
    expect(failure).toMatchObject({ name: 'AbortError' })
    expect(result.current.state).toEqual({ status: 'ready', catalog: catalogA })
  })

  it('keeps the first load\'s loading and error screens with «Reintentar»', async () => {
    const { repository, calls } = controlledRepository()
    const { result } = renderHook(() => useRefreshableCatalog(repository))
    expect(result.current.state).toEqual({ status: 'loading' })
    await act(async () => calls[0].reject(new TypeError('offline')))
    expect(result.current.state).toEqual({ status: 'error' })
    act(() => result.current.retry())
    await waitFor(() => expect(calls).toHaveLength(2))
    await act(async () => calls[1].resolve(catalogA))
    expect(result.current.state).toEqual({ status: 'ready', catalog: catalogA })
  })
})
