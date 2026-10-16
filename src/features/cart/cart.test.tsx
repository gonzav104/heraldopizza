import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import type { Product } from '@/domain/catalog'
import { prototypeCategories, prototypeProducts } from '@/data/prototype-catalog'
import { Storefront } from '@/app/Storefront'
import { resetOrderStore, useOrderStore } from './order-store'

const product = (name: string): Product => {
  const found = prototypeProducts.find((item) => item.name === name)
  if (!found) throw new Error(name)
  return found
}
const variantId = (name: string, variantName: string) => {
  const found = product(name).variants.find((variant) => variant.name === variantName)
  if (!found) throw new Error(variantName)
  return found.id
}

async function openCart() {
  render(<Storefront categories={prototypeCategories} products={prototypeProducts} promotions={[]} />)
  fireEvent.click(screen.getByRole('button', { name: /^Ver tu pedido/ }))
  return screen.findByRole('dialog', { name: 'Tu pedido' })
}

describe('cart', () => {
  beforeEach(() => {
    resetOrderStore()
    const { add } = useOrderStore.getState()
    add({ kind: 'product', productId: product('Muzzarella').id, variantId: variantId('Muzzarella', 'Entera'), quantity: 1, note: '' })
    add({ kind: 'product', productId: product('Especial').id, variantId: variantId('Especial', 'Media'), quantity: 1, note: '' })
    add({ kind: 'half', firstProductId: product('Muzzarella').id, secondProductId: product('Napolitana Heraldo').id, quantity: 1, note: '' })
  })

  it('labels whole, half, and half-and-half pizzas', async () => {
    const sheet = await openCart()
    const lines = within(sheet).getAllByRole('listitem')

    expect(lines[0]).toHaveTextContent(/^Muzzarella\s*Entera/)
    expect(lines[1]).toHaveTextContent(/^Especial\s*Media pizza/)
    expect(lines[2]).toHaveTextContent(/^Mitad y mitad\s*Muzzarella \+ Napolitana Heraldo/)
    expect(lines[2]).toHaveTextContent(/25\.000/)
  })

  it('removes a line and announces it', async () => {
    const sheet = await openCart()
    fireEvent.click(within(sheet).getByRole('button', { name: 'Quitar Especial (Media pizza) del pedido' }))

    expect(within(sheet).getAllByRole('listitem')).toHaveLength(2)
    expect(useOrderStore.getState().lines).toHaveLength(2)
    expect(screen.getByText(/^Quitaste media pizza de Especial\. Tu pedido: 2 productos/)).toBeInTheDocument()
  })
})

describe('bottom bar (S2)', () => {
  beforeEach(() => resetOrderStore())

  it('keeps a single category entry and no bottom bar while the order is empty', () => {
    render(<Storefront categories={prototypeCategories} products={prototypeProducts} promotions={[]} />)

    expect(screen.getAllByRole('button', { name: 'Categorías' })).toHaveLength(1)
    expect(screen.queryByRole('button', { name: /^Ver tu pedido/ })).not.toBeInTheDocument()
  })

  it('is reserved for the order: adding a product shows it without a second category entry', () => {
    render(<Storefront categories={prototypeCategories} products={prototypeProducts} promotions={[]} />)
    fireEvent.click(screen.getByRole('button', { name: /^Sumar Muzzarella, Entera/ }))

    expect(screen.getByRole('button', { name: /^Ver tu pedido: 1 producto/ })).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Categorías' })).toHaveLength(1)
  })
})
