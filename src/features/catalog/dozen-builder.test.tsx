import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { Storefront } from '@/app/Storefront'
import { prototypeCategories, prototypeProducts } from '@/data/prototype-catalog'
import { prototypePromotions } from '@/data/prototype-promotions'
import type { Product } from '@/domain/catalog'
import { resetOrderStore, useOrderStore } from '@/features/cart/order-store'

// P4: «Docena de empanadas a elección» opens a configurator for exactly 12 empanadas; the assorted dozen does not.

const DOZEN = 'Docena de empanadas a elección'

const renderMenu = (products: Product[] = prototypeProducts) =>
  render(<Storefront categories={prototypeCategories} products={products} promotions={prototypePromotions} />)

function openBuilder() {
  fireEvent.click(screen.getByRole('button', { name: new RegExp(`^Elegir los gustos de ${DOZEN}`) }))
  return screen.getByRole('dialog', { name: 'Elegí tus 12 empanadas' })
}

const add = (sheet: HTMLElement, flavor: string, times = 1) => {
  for (let i = 0; i < times; i++) fireEvent.click(within(sheet).getByRole('button', { name: `Sumar ${flavor}` }))
}
const addButton = () => screen.getByRole('button', { name: /^Agregar docena|^Faltan \d+ empanadas?/ })

describe('dozen to choose (P4)', () => {
  beforeEach(() => resetOrderStore())

  it('offers the catalog flavors by the unit, never the assorted dozen, and counts what is left', () => {
    renderMenu()
    const sheet = openBuilder()

    expect(within(sheet).getAllByRole('group').map((group) => group.getAttribute('aria-label'))).toHaveLength(10)
    expect(within(sheet).queryByText(/Docena surtida/)).not.toBeInTheDocument()
    expect(within(sheet).getByRole('status')).toHaveTextContent('Elegiste 0 de 12 · Faltan 12')

    add(sheet, 'Carne picada', 5)
    expect(within(sheet).getByRole('status')).toHaveTextContent('Elegiste 5 de 12 · Faltan 7')
    expect(addButton()).toBeDisabled()
  })

  it('stops at 12 and enables «Agregar docena» only at exactly 12, at the fixed promotion price', () => {
    renderMenu()
    const sheet = openBuilder()
    add(sheet, 'Carne picada', 5)
    add(sheet, 'Jamón y queso', 4)
    add(sheet, 'Pollo', 3)

    expect(within(sheet).getByRole('status')).toHaveTextContent('Elegiste 12 de 12 · Docena completa')
    for (const button of within(sheet).getAllByRole('button', { name: /^Sumar / })) expect(button).toBeDisabled()
    expect(addButton()).toBeEnabled()
    expect(addButton()).toHaveTextContent(/36\.000/)

    fireEvent.click(within(sheet).getByRole('button', { name: 'Quitar Pollo' }))
    expect(within(sheet).getByRole('status')).toHaveTextContent('Faltan 1')
    expect(addButton()).toBeDisabled()
  })

  it('adds the dozen with its flavors and note, and shows them under it in the cart', async () => {
    renderMenu()
    const sheet = openBuilder()
    add(sheet, 'Carne picada', 5)
    add(sheet, 'Jamón y queso', 4)
    add(sheet, 'Pollo', 3)
    fireEvent.change(within(sheet).getByLabelText(/Aclaración/), { target: { value: 'bien calientes' } })
    fireEvent.click(addButton())

    expect(useOrderStore.getState().lines).toMatchObject([{ kind: 'promotion', quantity: 1, note: 'bien calientes' }])
    fireEvent.click(screen.getByRole('button', { name: /^Ver tu pedido/ }))
    const cart = await screen.findByRole('dialog', { name: 'Tu pedido' })
    const line = within(cart).getAllByRole('listitem')[0]
    expect(line).toHaveTextContent(DOZEN)
    expect(within(line).getByRole('list', { name: 'Gustos' })).toHaveTextContent('5 Carne picada3 Pollo4 Jamón y queso')
  })

  it('keeps two different dozens apart and merges two identical ones', async () => {
    renderMenu()
    // Each build waits for the sheet to close, as a customer has to before opening it again.
    const build = async (flavors: [string, number][]) => {
      const sheet = openBuilder()
      for (const [flavor, times] of flavors) add(sheet, flavor, times)
      fireEvent.click(addButton())
      await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Elegí tus 12 empanadas' })).not.toBeInTheDocument())
    }
    await build([['Carne picada', 12]])
    await build([['Carne picada', 6], ['Pollo', 6]])
    await build([['Carne picada', 12]])

    expect(useOrderStore.getState().lines.map((line) => line.quantity)).toEqual([2, 1])
  })

  it('hides a flavor that cannot be ordered now', () => {
    renderMenu(prototypeProducts.map((item) => (item.name === 'Empanada de pollo' ? { ...item, inStock: false } : item)))
    const sheet = openBuilder()

    expect(within(sheet).queryByRole('button', { name: 'Sumar Pollo' })).not.toBeInTheDocument()
    expect(within(sheet).getAllByRole('group')).toHaveLength(9)
  })

  it('leaves the assorted dozen as it was: one tap adds it, with no configurator', () => {
    renderMenu()
    fireEvent.click(screen.getByRole('button', { name: /^Sumar Docena de empanadas surtidas/ }))

    expect(screen.queryByRole('dialog', { name: 'Elegí tus 12 empanadas' })).not.toBeInTheDocument()
    expect(useOrderStore.getState().lines).toEqual([expect.objectContaining({ kind: 'promotion', quantity: 1, note: '' })])
    expect(useOrderStore.getState().lines[0]).not.toHaveProperty('flavors')
  })

  it('keeps a saved dozen whose flavor ran out as an issue to review, blocking the checkout', async () => {
    const id = (name: string) => prototypeProducts.find((item) => item.name === name)?.id ?? name
    const dozen = prototypePromotions.find((item) => item.title === DOZEN)
    if (!dozen) throw new Error('dozen')
    useOrderStore.getState().add({
      kind: 'promotion',
      promotionId: dozen.id,
      quantity: 1,
      note: '',
      flavors: [
        { productId: id('Empanada de carne picada'), quantity: 9 },
        { productId: id('Empanada de pollo'), quantity: 3 },
      ],
    })
    renderMenu(prototypeProducts.map((item) => (item.name === 'Empanada de pollo' ? { ...item, inStock: false } : item)))

    fireEvent.click(screen.getByRole('button', { name: /^Ver tu pedido/ }))
    const cart = await screen.findByRole('dialog', { name: 'Tu pedido' })
    const review = within(cart).getByRole('region', { name: 'Revisá estos productos' })

    expect(within(review).getByRole('listitem')).toHaveTextContent(`${DOZEN}9 Carne picada, 3 PolloPollo: sin stock por ahora.`)
    expect(within(cart).getByRole('button', { name: 'Continuar' })).toBeDisabled()
    expect(within(review).getByRole('button', { name: `Quitar ${DOZEN} del pedido` })).toBeInTheDocument()
  })
})
