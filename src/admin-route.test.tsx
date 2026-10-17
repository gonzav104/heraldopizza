import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { FixtureCatalogRepository } from '@/data/fixture-catalog-repository'

const adminModuleLoaded = vi.fn()
vi.mock('@/features/admin/AdminRoute', () => {
  adminModuleLoaded()
  return { default: () => <p>Panel de prueba</p> }
})

const { default: App } = await import('@/App')

afterEach(() => {
  window.history.replaceState(null, '', '/')
})

describe('the /admin route', () => {
  it('loads the admin panel lazily on /admin', async () => {
    window.history.replaceState(null, '', '/admin')
    render(<App repository={new FixtureCatalogRepository()} />)

    expect(await screen.findByText('Panel de prueba')).toBeInTheDocument()
    expect(adminModuleLoaded).toHaveBeenCalledTimes(1)
  })

  it.each(['/', '/administracion', '/carta'])('keeps the public menu on %s', async (path) => {
    window.history.replaceState(null, '', path)
    render(<App repository={new FixtureCatalogRepository()} />)

    expect(await screen.findByRole('heading', { level: 2, name: 'Pizzas' })).toBeInTheDocument()
    expect(screen.queryByText('Panel de prueba')).not.toBeInTheDocument()
  })

  it('offers no link to /admin from the public menu', async () => {
    render(<App repository={new FixtureCatalogRepository()} />)
    await screen.findByRole('heading', { level: 2, name: 'Pizzas' })

    expect(document.querySelector('a[href*="admin"]')).toBeNull()
  })
})
