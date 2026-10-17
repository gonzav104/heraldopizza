import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from '@/App'
import { FixtureCatalogRepository } from '@/data/fixture-catalog-repository'
import { prototypePromotions } from '@/data/prototype-promotions'
import { CatalogConfigError, createPublicCatalogRepository } from '@/data/supabase-catalog-repository'
import type { Catalog, CatalogRepository } from '@/domain/catalog'

/** A repository whose load the test settles by hand, to see each state in turn. */
function controlledRepository() {
  const pending: { resolve: (catalog: Catalog) => void; reject: (error: unknown) => void }[] = []
  const repository: CatalogRepository = {
    load: vi.fn(() => new Promise<Catalog>((resolve, reject) => pending.push({ resolve, reject }))),
  }
  return { repository, pending }
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
    render(<App repository={new FixtureCatalogRepository()} loadPromotions={async () => []} />)

    await screen.findByRole('heading', { level: 2, name: 'Pizzas' })
    expect(screen.queryByRole('heading', { level: 2, name: 'Promos' })).not.toBeInTheDocument()
  })

  it('says the menu is not available when the catalog is empty', async () => {
    const { repository, pending } = controlledRepository()
    render(<App repository={repository} />)
    pending[0].resolve({ categories: [], products: [], promotions: [] })

    expect(await screen.findByRole('status')).toHaveTextContent('La carta no está disponible en este momento.')
  })
})
