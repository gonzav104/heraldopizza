import { afterEach, describe, expect, it, vi } from 'vitest'
import { CatalogDataError } from '@/data/catalog-mapper'
import {
  CATALOG_SELECT,
  PROMOTIONS_SELECT,
  CatalogConfigError,
  CatalogLoadError,
  SupabaseCatalogRepository,
  createPublicCatalogRepository,
} from '@/data/supabase-catalog-repository'

const config = { url: 'https://example.supabase.test', publishableKey: 'sb_publishable_fake_key' }
const rows = [
  {
    id: 'cat-pizzas',
    nombre: 'Pizzas',
    orden: 1,
    recargo_envio: true,
    productos: [
      {
        id: 'p-muzza',
        nombre: 'Muzzarella',
        descripcion: null,
        solo_por_encargo: false,
        aviso_encargo: null,
        sin_stock: false,
        orden: 1,
        variantes: [{ id: 'v-muzza', nombre: 'Entera', precio: 16000, orden: 1 }],
      },
    ],
  },
]

const promotionRows = [
  {
    codigo: 'promo-docena-eleccion',
    titulo: 'Docena de empanadas a elección',
    descripcion: null,
    precio: 36000,
    orden: 5,
    vigente_desde: null,
    vigente_hasta: null,
    dias_semana: null,
    eleccion_categoria_id: 'cat-empanadas',
    eleccion_unidades: 12,
  },
]

/** Answers each request by its table: `categorias` (the menu) and `promociones`. */
function stubFetch(categories: Response | Error, promotions: Response | Error = Response.json([])) {
  const answer = (response: Response | Error) =>
    response instanceof Error ? Promise.reject(response) : Promise.resolve(response.clone())
  const fetchMock = vi.fn((input: URL | string) => answer(String(input).includes('/rest/v1/promociones') ? promotions : categories))
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function request(fetchMock: ReturnType<typeof stubFetch>, table: 'categorias' | 'promociones') {
  const call = fetchMock.mock.calls.find(([input]) => String(input).includes(`/rest/v1/${table}`))
  if (!call) throw new Error(`no request to ${table}`)
  const [input, init] = call as unknown as [URL, RequestInit]
  return { url: new URL(String(input)), init }
}
const lastRequest = (fetchMock: ReturnType<typeof stubFetch>) => request(fetchMock, 'categorias')

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('SupabaseCatalogRepository', () => {
  it('reads the whole menu with one aggregated GET, naming every column', async () => {
    const fetchMock = stubFetch(Response.json(rows))

    const catalog = await new SupabaseCatalogRepository(config).load()

    expect(fetchMock).toHaveBeenCalledTimes(2)
    const { url } = lastRequest(fetchMock)
    expect(url.origin + url.pathname).toBe('https://example.supabase.test/rest/v1/categorias')
    expect(url.searchParams.get('select')).toBe(CATALOG_SELECT)
    expect(url.searchParams.get('select')).not.toContain('*')
    expect(url.searchParams.get('order')).toBe('orden.asc')
    expect(url.searchParams.get('productos.order')).toBe('orden.asc')
    expect(url.searchParams.get('productos.variantes.order')).toBe('orden.asc')
    expect(catalog.categories.map((category) => category.name)).toEqual(['Pizzas'])
    expect(catalog.products[0].variants).toEqual([{ id: 'v-muzza', name: 'Entera', price: 16000 }])
    expect(catalog.promotions).toEqual([])
  })

  it('reads the promotions with a second GET in parallel, naming every column, and keeps their commercial code (P5a)', async () => {
    const fetchMock = stubFetch(Response.json(rows), Response.json(promotionRows))

    const catalog = await new SupabaseCatalogRepository(config).load()

    const { url, init } = request(fetchMock, 'promociones')
    expect(url.origin + url.pathname).toBe('https://example.supabase.test/rest/v1/promociones')
    expect(url.searchParams.get('select')).toBe(PROMOTIONS_SELECT)
    expect(url.searchParams.get('select')).not.toContain('*')
    expect(url.searchParams.get('order')).toBe('orden.asc,codigo.asc')
    expect(init).toMatchObject({ method: 'GET', credentials: 'omit' })
    expect(init.body).toBeUndefined()
    expect(catalog.promotions).toEqual([
      {
        id: 'promo-docena-eleccion',
        title: 'Docena de empanadas a elección',
        description: null,
        price: 36000,
        imageUrl: null,
        activeFrom: null,
        activeTo: null,
        weekdays: [],
        flavorChoice: { categoryId: 'cat-empanadas', units: 12 },
      },
    ])
  })

  it('starts both requests before either answers, with one signal for both', async () => {
    let release: () => void = () => undefined
    const gate = new Promise<void>((resolve) => (release = resolve))
    const fetchMock = vi.fn(async (input: URL | string) => {
      await gate
      return Response.json(String(input).includes('promociones') ? [] : rows)
    })
    vi.stubGlobal('fetch', fetchMock)
    const outer = new AbortController()

    const loading = new SupabaseCatalogRepository(config).load(outer.signal)
    await Promise.resolve()
    expect(fetchMock).toHaveBeenCalledTimes(2)
    const signals = fetchMock.mock.calls.map((call) => (call as unknown as [URL, RequestInit])[1].signal)
    expect(signals[0]).toBe(signals[1])

    outer.abort()
    expect(signals[0]?.aborted).toBe(true)
    release()
    await loading.catch(() => undefined)
  })

  it('fails with a load error when the promotions cannot be read, and stops the other request', async () => {
    const fetchMock = stubFetch(Response.json(rows), new Response('{}', { status: 500 }))

    await expect(new SupabaseCatalogRepository(config).load()).rejects.toBeInstanceOf(CatalogLoadError)
    expect(request(fetchMock, 'categorias').init.signal?.aborted).toBe(true)
  })

  it('fails with a data error when a promotion breaks the contract', async () => {
    stubFetch(Response.json(rows), Response.json([{ ...promotionRows[0], precio: 0 }]))

    await expect(new SupabaseCatalogRepository(config).load()).rejects.toBeInstanceOf(CatalogDataError)
  })

  it('sends only the publishable key, as a GET without cookies', async () => {
    const fetchMock = stubFetch(Response.json(rows))

    await new SupabaseCatalogRepository(config).load()

    const { init } = lastRequest(fetchMock)
    expect(init.method).toBe('GET')
    expect(init.credentials).toBe('omit')
    expect(init.body).toBeUndefined()
    expect(new Headers(init.headers).get('apikey')).toBe('sb_publishable_fake_key')
    expect(new Headers(init.headers).has('authorization')).toBe(false)
  })

  it('accepts a project URL with a trailing slash', async () => {
    const fetchMock = stubFetch(Response.json(rows))

    await new SupabaseCatalogRepository({ ...config, url: 'https://example.supabase.test/' }).load()

    expect(lastRequest(fetchMock).url.pathname).toBe('/rest/v1/categorias')
  })

  it('fails with a load error when the API answers with an error status', async () => {
    stubFetch(new Response('{"message":"boom"}', { status: 503 }))

    await expect(new SupabaseCatalogRepository(config).load()).rejects.toBeInstanceOf(CatalogLoadError)
  })

  it('fails with a load error when the network fails', async () => {
    stubFetch(new TypeError('Failed to fetch'))

    await expect(new SupabaseCatalogRepository(config).load()).rejects.toBeInstanceOf(CatalogLoadError)
  })

  it('fails with a data error when the response has an unexpected shape', async () => {
    stubFetch(Response.json({ categorias: [] }))

    await expect(new SupabaseCatalogRepository(config).load()).rejects.toBeInstanceOf(CatalogDataError)
  })
})

describe('createPublicCatalogRepository', () => {
  it('builds the repository from VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY', async () => {
    const fetchMock = stubFetch(Response.json(rows))

    await createPublicCatalogRepository({
      VITE_SUPABASE_URL: config.url,
      VITE_SUPABASE_PUBLISHABLE_KEY: config.publishableKey,
    }).load()

    expect(lastRequest(fetchMock).url.origin).toBe('https://example.supabase.test')
  })

  it.each([
    ['without a URL', { VITE_SUPABASE_PUBLISHABLE_KEY: config.publishableKey }],
    ['without a key', { VITE_SUPABASE_URL: config.url }],
    ['with a URL that is not http(s)', { VITE_SUPABASE_URL: 'ftp://x', VITE_SUPABASE_PUBLISHABLE_KEY: 'k' }],
  ])('fails with a configuration error %s, and never calls the network', async (_label, env) => {
    const fetchMock = stubFetch(Response.json(rows))

    await expect(createPublicCatalogRepository(env).load()).rejects.toBeInstanceOf(CatalogConfigError)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
