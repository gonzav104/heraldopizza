import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { Storefront } from '@/app/Storefront'
import { prototypeCategories, prototypeProducts } from '@/data/prototype-catalog'
import { useOrderStorageStatus, type OrderStorageIssue } from './order-storage'
import { resetOrderStore, useOrderStore } from './order-store'

function renderWith(issue: OrderStorageIssue) {
  useOrderStorageStatus.setState({ issue })
  render(<Storefront categories={prototypeCategories} products={prototypeProducts} promotions={[]} />)
}

describe('order storage notice (RF-17)', () => {
  beforeEach(() => resetOrderStore())

  it('shows nothing when the order was recovered in full', () => {
    render(<Storefront categories={prototypeCategories} products={prototypeProducts} promotions={[]} />)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it.each<[OrderStorageIssue, string]>([
    [{ kind: 'partial', discarded: 1 }, 'Recuperamos tu pedido, pero 1 producto no se pudo recuperar. Revisalo antes de enviarlo.'],
    [{ kind: 'partial', discarded: 3 }, 'Recuperamos tu pedido, pero 3 productos no se pudieron recuperar. Revisalo antes de enviarlo.'],
    [{ kind: 'corrupt' }, 'No pudimos recuperar tu pedido anterior. Si tenías productos elegidos, volvé a agregarlos desde la carta.'],
    [{ kind: 'incompatible' }, 'No pudimos recuperar tu pedido anterior. Si tenías productos elegidos, volvé a agregarlos desde la carta.'],
    [{ kind: 'unavailable' }, 'Este navegador no permite guardar tu pedido: si recargás o cerrás la página, se pierde.'],
  ])('explains %o and closes on request', (issue, message) => {
    renderWith(issue)

    expect(screen.getByRole('alert')).toHaveTextContent(message)
    fireEvent.click(screen.getAllByRole('button', { name: 'Cerrar aviso' })[0])
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.queryByText(message)).not.toBeInTheDocument()
  })

  it('repeats the notice inside the cart, where a save that fails mid-visit is seen, without announcing it twice', async () => {
    const muzza = prototypeProducts.find((product) => product.name === 'Muzzarella')
    if (!muzza) throw new Error('Muzzarella')
    useOrderStore.getState().add({ kind: 'product', productId: muzza.id, variantId: muzza.variants[0].id, quantity: 1, note: '' })
    renderWith({ kind: 'unavailable' })
    fireEvent.click(screen.getByRole('button', { name: /^Ver tu pedido/ }))
    const sheet = await screen.findByRole('dialog', { name: 'Tu pedido' })

    expect(within(sheet).getByText(/Este navegador no permite guardar tu pedido/)).toBeInTheDocument()
    expect(within(sheet).queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getAllByRole('alert')).toHaveLength(1)
  })
})
