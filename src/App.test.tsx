import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from '@/App'
import { FixtureCatalogRepository } from '@/data/fixture-catalog-repository'
import { prototypePromotions } from '@/data/prototype-promotions'
import { CatalogConfigError, createPublicCatalogRepository } from '@/data/supabase-catalog-repository'
import type { Catalog, CatalogRepository, Promotion } from '@/domain/catalog'

/** A repository whose load the test settles by hand, to see each state in turn. */
function controlledRepository() {
  const pending: { resolve: (catalog: Catalog) => void; reject: (error: unknown) => void }[] = []
  const repository: CatalogRepository = {
    load: vi.fn(() => new Promise<Catalog>((resolve, reject) => pending.push({ resolve, reject }))),
  }
  return { repository, pending }
}

/** A promotions loader the test settles by hand, so assertions run only after it has finished. */
function controlledPromotions() {
  let resolve: (promotions: Promotion[]) => void = () => undefined
  const load = vi.fn(() => new Promise<Promotion[]>((settle) => (resolve = settle)))
  return { load, resolve: (promotions: Promotion[]) => resolve(promotions) }
}

/** A promotion as the real source would return it (test data only). */
const catalogPromotion: Promotion = {
  id: 'catalog-promo',
  title: 'Promo de prueba del catálogo',
  description: null,
  price: 1000,
  imageUrl: null,
  activeFrom: null,
  activeTo: null,
  weekdays: [],
  deliveryPizzas: null,
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('App', () => {
  it('opens on the menu: brand, category navigation, and the pizzas up front, with no hero', async () => {
    render(<App repository={new FixtureCatalogRepository()} />)

    expect(await screen.findByRole('heading', { level: 1, name: 'Heraldo Pizza' })).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Categorías de la carta' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Pizzas' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Sumar Muzzarella, Entera/ })).toBeInTheDocument()
  })

  it('announces that the menu is loading while the catalog is on its way', () => {
    const { repository } = controlledRepository()
    render(<App repository={repository} />)

    expect(screen.getByRole('status')).toHaveTextContent('Cargando la carta…')
    expect(screen.queryByRole('navigation', { name: 'Categorías de la carta' })).not.toBeInTheDocument()
  })

  it('shows an error with «Reintentar» when the catalog fails, and never falls back to other data', async () => {
    const { repository, pending } = controlledRepository()
    render(<App repository={repository} />)
    pending[0].reject(new Error('503'))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('No pudimos cargar la carta.')
    expect(screen.queryByRole('heading', { level: 2, name: 'Pizzas' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Sumar / })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(repository.load).toHaveBeenCalledTimes(2)
    expect(screen.getByRole('status')).toHaveTextContent('Cargando la carta…')

    pending[1].resolve(await new FixtureCatalogRepository().load())
    expect(await screen.findByRole('heading', { level: 2, name: 'Pizzas' })).toBeInTheDocument()
  })

  it('shows the same error, without touching the network, when the build has no Supabase settings', async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    const repository = createPublicCatalogRepository({})
    await expect(repository.load()).rejects.toBeInstanceOf(CatalogConfigError)

    render(<App repository={repository} />)

    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos cargar la carta.')
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('shows the Promos section when promotions are available (prototype data in development)', async () => {
    render(<App repository={new FixtureCatalogRepository()} loadPromotions={async () => prototypePromotions} />)

    expect(await screen.findByRole('heading', { level: 2, name: 'Promos' })).toBeInTheDocument()
    expect(screen.getByRole('article', { name: 'Tres pizzas Muzzarella' })).toBeInTheDocument()
  })

  it('renders no Promos section when there is no source of promotions (production until U9)', async () => {
    const promotions = controlledPromotions()
    render(<App repository={new FixtureCatalogRepository()} loadPromotions={promotions.load} />)

    await act(async () => promotions.resolve([]))

    expect(await screen.findByRole('heading', { level: 2, name: 'Pizzas' })).toBeInTheDocument()
    expect(promotions.load).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('heading', { level: 2, name: 'Promos' })).not.toBeInTheDocument()
  })

  it('waits for the promotions before showing the menu, so a saved promo is never judged without them (P2)', async () => {
    const promotions = controlledPromotions()
    render(<App repository={new FixtureCatalogRepository()} loadPromotions={promotions.load} />)
    await act(async () => undefined)

    expect(screen.getByRole('status')).toHaveTextContent('Cargando la carta…')
    expect(screen.queryByRole('heading', { level: 2, name: 'Pizzas' })).not.toBeInTheDocument()

    await act(async () => promotions.resolve(prototypePromotions))

    expect(await screen.findByRole('heading', { level: 2, name: 'Promos' })).toBeInTheDocument()
  })

  it('shows the error with «Reintentar» when the promotions fail, never a menu without them (P2)', async () => {
    const load = vi.fn<() => Promise<Promotion[]>>().mockRejectedValueOnce(new Error('no source')).mockResolvedValue(prototypePromotions)
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    render(<App repository={new FixtureCatalogRepository()} loadPromotions={load} />)

    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos cargar la carta.')
    expect(screen.queryByRole('heading', { level: 2, name: 'Pizzas' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))

    expect(await screen.findByRole('heading', { level: 2, name: 'Promos' })).toBeInTheDocument()
    expect(load).toHaveBeenCalledTimes(2)
  })

  it('shows only the catalog promotions when the real source has them, never the prototype ones', async () => {
    const fixture = await new FixtureCatalogRepository().load()
    const repository: CatalogRepository = { load: async () => ({ ...fixture, promotions: [catalogPromotion] }) }
    const promotions = controlledPromotions()
    render(<App repository={repository} loadPromotions={promotions.load} />)

    await act(async () => promotions.resolve(prototypePromotions))

    expect(await screen.findByRole('article', { name: catalogPromotion.title })).toBeInTheDocument()
    expect(screen.queryByRole('article', { name: 'Tres pizzas Muzzarella' })).not.toBeInTheDocument()
  })

  it('says the menu is not available when the catalog is empty', async () => {
    const { repository, pending } = controlledRepository()
    render(<App repository={repository} />)
    pending[0].resolve({ categories: [], products: [], promotions: [] })

    // The loading notice is also a status: wait for the empty-state text, then check it is the status.
    const notice = await screen.findByText('La carta no está disponible en este momento.')
    expect(notice.closest('[role="status"]')).not.toBeNull()
    expect(screen.queryByText('Cargando la carta…')).not.toBeInTheDocument()
  })
})
