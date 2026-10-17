import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { FixtureCatalogRepository } from '@/data/fixture-catalog-repository'

// The lazy admin chunk fails to load (offline, or an old chunk hash after a redeploy).
vi.mock('@/features/admin/AdminRoute', () => {
  throw new Error('Failed to fetch dynamically imported module')
})

const { default: App } = await import('@/App')

afterEach(() => {
  window.history.replaceState(null, '', '/')
})

describe('the /admin route when its chunk cannot load', () => {
  it('shows an error with «Reintentar» instead of a blank page', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    window.history.replaceState(null, '', '/admin')
    render(<App repository={new FixtureCatalogRepository()} />)

    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos cargar el panel.')
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
  })
})
