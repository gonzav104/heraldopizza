import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { Storefront } from '@/app/Storefront'
import { prototypeCategories, prototypeProducts } from '@/data/prototype-catalog'
import { prototypePromotions } from '@/data/prototype-promotions'
import { useOrderStore } from '@/features/cart/order-store'

function renderMenu(promotions = prototypePromotions) {
  render(<Storefront categories={prototypeCategories} products={prototypeProducts} promotions={promotions} />)
}

afterEach(() => {
  act(() => useOrderStore.getState().clear())
})

describe('Promos section', () => {
  it('opens the menu with a «Promos» section and a category entry for it', () => {
    renderMenu()

    expect(screen.getByRole('heading', { level: 2, name: 'Promos' })).toBeInTheDocument()
    expect(within(screen.getByRole('navigation', { name: 'Categorías de la carta' })).getByRole('link', { name: /Promos/ })).toBeInTheDocument()
  })

  it('lists every combo as scannable items, with its price', () => {
    renderMenu()
    const card = screen.getByRole('article', { name: 'Especial + Coca-Cola 1,75 + 6 empanadas de JyQ' })

    expect(within(card).getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      'Especial',
      'Coca-Cola 1,75',
      '6 empanadas de JyQ',
    ])
    expect(within(card).getByText('$ 42.500', { normalizer: (text) => text.replace(/\s/g, ' ') })).toBeInTheDocument()
  })

  it('shows the owner’s clarification', () => {
    renderMenu()

    expect(within(screen.getByRole('article', { name: 'Muzza + 6 empanadas surtidas' })).getByText('No son a elección.')).toBeInTheDocument()
  })

  it('adds a promo to the order as a single line (RF-12)', () => {
    renderMenu()

    fireEvent.click(screen.getByRole('button', { name: /^Sumar Tres pizzas Muzzarella/ }))

    expect(useOrderStore.getState().lines).toEqual([
      expect.objectContaining({ kind: 'promotion', promotionId: prototypePromotions[6].id, quantity: 1 }),
    ])
  })

  it('renders nothing, and no category entry, without promotions', () => {
    renderMenu([])

    expect(screen.queryByRole('heading', { level: 2, name: 'Promos' })).not.toBeInTheDocument()
    expect(within(screen.getByRole('navigation', { name: 'Categorías de la carta' })).queryByRole('link', { name: /Promos/ })).not.toBeInTheDocument()
  })
})
