import type { Catalog, CatalogRepository } from '@/domain/catalog'
import { mapCatalogRows, mapPromotionRows } from '@/data/catalog-mapper'

/**
 * The one place where the public menu talks to the network (privacy-claims.test.ts enforces it). It reads the
 * catalog and its promotions from the Supabase Data API with the publishable key: two GETs in parallel, no cookies,
 * nothing about the customer.
 */

/** Every column the menu uses, named one by one (never `*`), with products and variants embedded in one request. */
export const CATALOG_SELECT =
  'id,nombre,orden,recargo_envio,' +
  'productos(id,nombre,descripcion,solo_por_encargo,aviso_encargo,sin_stock,orden,' +
  'variantes(id,nombre,precio,orden))'

/** Every promotion column the menu uses (P5a), named one by one. No internal id, no timestamps, no image. */
export const PROMOTIONS_SELECT =
  'codigo,titulo,descripcion,precio,orden,vigente_desde,vigente_hasta,dias_semana,eleccion_categoria_id,eleccion_unidades'

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

  /**
   * The menu and its promotions, read with two GETs started together (P5a). Both share one signal: the caller's
   * cancellation stops both, and a failure in one stops the other. Either failure fails the whole load, so the menu
   * never shows without its promotions.
   */
  async load(signal?: AbortSignal): Promise<Catalog> {
    const base = this.config.url.endsWith('/') ? this.config.url : `${this.config.url}/`
    const catalogUrl = new URL('rest/v1/categorias', base)
    catalogUrl.searchParams.set('select', CATALOG_SELECT)
    catalogUrl.searchParams.set('order', 'orden.asc')
    catalogUrl.searchParams.set('productos.order', 'orden.asc')
    catalogUrl.searchParams.set('productos.variantes.order', 'orden.asc')
    const promotionsUrl = new URL('rest/v1/promociones', base)
    promotionsUrl.searchParams.set('select', PROMOTIONS_SELECT)
    promotionsUrl.searchParams.set('order', 'orden.asc,codigo.asc')

    const shared = new AbortController()
    const abortBoth = () => shared.abort(signal?.reason)
    if (signal?.aborted) abortBoth()
    signal?.addEventListener('abort', abortBoth, { once: true })
    try {
      const [catalogRows, promotionRows] = await Promise.all([
        this.getJson(catalogUrl, shared.signal, 'catalog'),
        this.getJson(promotionsUrl, shared.signal, 'promotions'),
      ])
      return { ...mapCatalogRows(catalogRows), promotions: mapPromotionRows(promotionRows) }
    } catch (error) {
      shared.abort()
      if (signal?.aborted) throw signal.reason ?? error
      throw error
    } finally {
      signal?.removeEventListener('abort', abortBoth)
    }
  }

  /** The only network call of the public menu: a GET with the publishable key, no cookies, and no body. */
  private async getJson(url: URL, signal: AbortSignal, what: string): Promise<unknown> {
    let response: Response
    try {
      response = await fetch(url, {
        method: 'GET',
        headers: { apikey: this.config.publishableKey, Accept: 'application/json' },
        credentials: 'omit',
        signal,
      })
    } catch (error) {
      if (signal.aborted) throw error
      throw new CatalogLoadError(`The ${what} could not be reached`, { cause: error })
    }
    if (!response.ok) throw new CatalogLoadError(`The ${what} request failed with status ${response.status}`)
    try {
      return await response.json()
    } catch (error) {
      throw new CatalogLoadError(`The ${what} response is not valid JSON`, { cause: error })
    }
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
