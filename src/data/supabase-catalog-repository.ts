import type { Catalog, CatalogRepository } from '@/domain/catalog'
import { mapCatalogRows } from '@/data/catalog-mapper'

/**
 * The one place where the public menu talks to the network (privacy-claims.test.ts enforces it). It reads the
 * catalog from the Supabase Data API with the publishable key: one GET, no cookies, nothing about the customer.
 */

/** Every column the menu uses, named one by one (never `*`), with products and variants embedded in one request. */
export const CATALOG_SELECT =
  'id,nombre,orden,recargo_envio,' +
  'productos(id,nombre,descripcion,solo_por_encargo,aviso_encargo,sin_stock,orden,' +
  'variantes(id,nombre,precio,orden))'

/** The menu could not be read: network failure or an error status from the API. */
export class CatalogLoadError extends Error {
  override name = 'CatalogLoadError'
}

/** The build has no Supabase URL or publishable key, so the menu cannot be read at all. */
export class CatalogConfigError extends Error {
  override name = 'CatalogConfigError'
}

export interface SupabaseCatalogConfig {
  url: string
  publishableKey: string
}

export class SupabaseCatalogRepository implements CatalogRepository {
  private readonly config: SupabaseCatalogConfig

  constructor(config: SupabaseCatalogConfig) {
    this.config = config
  }

  async load(signal?: AbortSignal): Promise<Catalog> {
    const base = this.config.url.endsWith('/') ? this.config.url : `${this.config.url}/`
    const url = new URL('rest/v1/categorias', base)
    url.searchParams.set('select', CATALOG_SELECT)
    url.searchParams.set('order', 'orden.asc')
    url.searchParams.set('productos.order', 'orden.asc')
    url.searchParams.set('productos.variantes.order', 'orden.asc')

    let response: Response
    try {
      response = await fetch(url, {
        method: 'GET',
        headers: { apikey: this.config.publishableKey, Accept: 'application/json' },
        credentials: 'omit',
        signal,
      })
    } catch (error) {
      if (signal?.aborted) throw error
      throw new CatalogLoadError('The catalog could not be reached', { cause: error })
    }
    if (!response.ok) throw new CatalogLoadError(`The catalog request failed with status ${response.status}`)

    let rows: unknown
    try {
      rows = await response.json()
    } catch (error) {
      throw new CatalogLoadError('The catalog response is not valid JSON', { cause: error })
    }
    return { ...mapCatalogRows(rows), promotions: [] }
  }
}

interface PublicCatalogEnv {
  VITE_SUPABASE_URL?: string
  VITE_SUPABASE_PUBLISHABLE_KEY?: string
}

/** Builds the menu's repository from the build environment; a missing or invalid value fails on load, visibly. */
export function createPublicCatalogRepository(env: PublicCatalogEnv = import.meta.env): CatalogRepository {
  const url = env.VITE_SUPABASE_URL?.trim()
  const publishableKey = env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()
  if (!url || !publishableKey || !/^https?:\/\//.test(url)) {
    return {
      load: () =>
        Promise.reject(new CatalogConfigError('VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY must be set')),
    }
  }
  return new SupabaseCatalogRepository({ url, publishableKey })
}
