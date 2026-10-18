import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { prototypePromotions } from '@/data/prototype-promotions'
import { loadDevPromotions } from '@/data/dev-promotions'
import { DesignSystemView } from './DesignSystemView'

// The global setup mocks the loader with a promise that never settles; here each test decides how it settles.
vi.mock('@/data/dev-promotions', () => ({ loadDevPromotions: vi.fn() }))

afterEach(() => {
  vi.mocked(loadDevPromotions).mockReset()
})

describe('#sistema Promos block', () => {
  it('shows the prototype promos once loaded, each card counting only its own taps', async () => {
    vi.mocked(loadDevPromotions).mockResolvedValue(prototypePromotions)
    render(<DesignSystemView />)

    const second = await screen.findByRole('button', { name: /^Sumar Especial \+ Pizza Muzzarella,/ })
    fireEvent.click(second)

    expect(second).toHaveAccessibleName(/1 en tu pedido$/)
    expect(screen.getByRole('button', { name: /^Sumar Muzza \+ 6 empanadas surtidas,/ })).not.toHaveAccessibleName(/en tu pedido/)
    expect(screen.getByText(/Promos reales del local, cargadas solo en desarrollo/)).toBeInTheDocument()
  })

  it('explains there is no source yet when the loader fails, with no cards', async () => {
    vi.mocked(loadDevPromotions).mockRejectedValue(new Error('no source'))
    render(<DesignSystemView />)
    await act(async () => undefined)

    expect(screen.getByText(/Todavía no hay una fuente de promociones/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Sumar Muzza \+ 6 empanadas surtidas,/ })).not.toBeInTheDocument()
  })
})
