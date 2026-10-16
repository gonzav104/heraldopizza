import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import type { Product } from '@/domain/catalog'
import { prototypeCategories, prototypeProducts } from '@/data/prototype-catalog'
import { Storefront } from '@/app/Storefront'
import { resetOrderStore, useOrderStore } from '@/features/cart/order-store'
import { CategoryBar } from './CategoryBar'
import { PizzaRow } from './ProductRow'
import { ProductSheet } from './ProductSheet'

const product = (name: string): Product => {
  const found = prototypeProducts.find((item) => item.name === name)
  if (!found) throw new Error(name)
  return found
}
const variantId = (name: string, variantName: string) => product(name).variants.find((variant) => variant.name === variantName)?.id

const renderMenu = () => render(<Storefront categories={prototypeCategories} products={prototypeProducts} promotions={[]} />)
const menu = () => within(screen.getByRole('main'))
// Closing a sheet goes back in history asynchronously; let it land before the next test opens one.
/** The visible price line shows only the math (the mode pill names the mode); the live region says both. */
function expectPrice(sheet: HTMLElement, visible: string, spoken: string) {
  const math = within(sheet).getByTestId('precio-armado')
  expect(math).toHaveTextContent(new RegExp(`^${visible.replace(/[$+.]/g, '\\$&').replace(/ /g, '\\s')}$`))
  expect(math.closest('[aria-live="polite"]')).toHaveTextContent(spoken)
}
const sheetsClosed = () => waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

describe('menu', () => {
  beforeEach(() => resetOrderStore())

  it('adds a whole pizza with one tap: badge, cart total, and a short confirmation (D1, RF-15)', () => {
    renderMenu()
    expect(screen.queryByRole('button', { name: /Ver tu pedido/ })).not.toBeInTheDocument()

    fireEvent.click(menu().getByRole('button', { name: /^Sumar Muzzarella, Entera/ }))
    fireEvent.click(menu().getByRole('button', { name: /^Sumar Muzzarella, Entera/ }))

    expect(menu().getByRole('button', { name: /^Sumar Muzzarella, Entera, .*2 en tu pedido$/ })).toBeInTheDocument()
    const cartBar = screen.getByRole('button', { name: /^Ver tu pedido: 2 productos/ })
    expect(cartBar).toHaveTextContent(/32\.000/)
    expect(cartBar).toHaveTextContent('Agregaste Muzzarella entera')
  })

  it('keeps the half price visible, and opens "Armá tu pizza" with that flavor instead of adding it (RF-60, D1)', async () => {
    renderMenu()
    fireEvent.click(menu().getByRole('button', { name: /^Armar media pizza o mitad y mitad con Muzzarella, media \$\s10\.500$/ }))

    const sheet = await screen.findByRole('dialog', { name: 'Armá tu pizza' })
    expect(within(sheet).getByText('Media pizza')).toBeInTheDocument()
    expectPrice(sheet, '$ 10.500', 'Media pizza: $ 10.500')
    expect(useOrderStore.getState().lines).toEqual([])
  })

  it('shows "Consultar en barra" without an add control for unpublished prices (RN-01)', () => {
    renderMenu()
    const row = screen.getByRole('heading', { name: 'Café cortado' }).closest('li')
    if (!row) throw new Error('row')

    expect(within(row).getByText('Consultar en barra')).toBeInTheDocument()
    expect(within(row).queryByRole('button', { name: /^Sumar/ })).not.toBeInTheDocument()
  })

  it('keeps out-of-stock pizzas visible but not addable (RF-05)', () => {
    render(
      <ul>
        <PizzaRow product={{ ...product('Fugazzeta'), inStock: false }} onOpen={() => {}} onBuild={() => {}} />
      </ul>,
    )

    expect(screen.getByText('Sin stock')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Sumar Fugazzeta/ })).toBeDisabled()
    expect(screen.getByRole('button', { name: /^Armar media pizza o mitad y mitad con Fugazzeta/ })).toBeDisabled()
  })

  it('makes the whole name and description block the button that opens the sheet', async () => {
    renderMenu()
    const napolitana = product('Napolitana Heraldo')
    const opener = screen.getByRole('button', { name: 'Napolitana Heraldo' })
    expect(opener).toHaveAccessibleDescription(napolitana.description ?? '')

    fireEvent.click(within(opener).getByText(napolitana.description ?? ''))
    expect(await screen.findByRole('dialog', { name: 'Napolitana Heraldo' })).toBeInTheDocument()
  })

  it('opens the sheet from a compact row too', async () => {
    renderMenu()
    fireEvent.click(screen.getByRole('button', { name: 'Coca-Cola 1,75 L' }))
    expect(await screen.findByRole('dialog', { name: 'Coca-Cola 1,75 L' })).toBeInTheDocument()
  })

  it('adds from the product sheet with variant, quantity, and note (RF-13, RF-14)', async () => {
    renderMenu()
    fireEvent.click(screen.getByRole('button', { name: 'Ensaimada' }))

    const sheet = await screen.findByRole('dialog', { name: 'Ensaimada' })
    fireEvent.click(within(sheet).getByRole('radio', { name: /Grande/ }))
    fireEvent.click(within(sheet).getByRole('button', { name: 'Sumar Ensaimada' }))
    fireEvent.change(within(sheet).getByLabelText(/Aclaración/), { target: { value: 'para el domingo' } })
    fireEvent.click(within(sheet).getByRole('button', { name: /^Agregar\s*\$\s70\.000/ }))

    expect(useOrderStore.getState().lines).toMatchObject([
      { kind: 'product', productId: product('Ensaimada').id, variantId: variantId('Ensaimada', 'Grande'), quantity: 2, note: 'para el domingo' },
    ])
    await sheetsClosed()
  })

  it('offers only the whole pizza in its sheet, and hands half pizzas over to "Armá tu pizza" without stacking (D1)', async () => {
    renderMenu()
    fireEvent.click(screen.getByRole('button', { name: 'Napolitana Heraldo' }))

    const sheet = await screen.findByRole('dialog', { name: 'Napolitana Heraldo' })
    expect(within(sheet).queryByRole('radio')).not.toBeInTheDocument()
    expect(within(sheet).getByRole('button', { name: /^Agregar\s*\$\s29\.000/ })).toBeInTheDocument()

    fireEvent.click(within(sheet).getByRole('button', { name: '¿Querés media o mitad y mitad? Armá tu pizza' }))
    const builder = await screen.findByRole('dialog', { name: 'Armá tu pizza' })
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Napolitana Heraldo' })).not.toBeInTheDocument())
    expectPrice(builder, '$ 14.500', 'Media pizza: $ 14.500')
  })

  it('offers no add button in the sheet for a product without a price (RN-01)', async () => {
    renderMenu()
    fireEvent.click(screen.getByRole('button', { name: 'Negroni' }))

    const sheet = await screen.findByRole('dialog', { name: 'Negroni' })
    expect(within(sheet).getByText(/no se puede sumar al pedido/)).toBeInTheDocument()
    expect(within(sheet).queryByRole('button', { name: /Agregar/ })).not.toBeInTheDocument()
  })

  it('counts empanadas per flavor with a stepper (RF-61)', () => {
    renderMenu()
    fireEvent.click(menu().getByRole('button', { name: 'Sumar Empanada de carne picada' }))
    fireEvent.click(menu().getByRole('button', { name: 'Sumar Empanada de carne picada' }))
    fireEvent.click(menu().getByRole('button', { name: 'Quitar Empanada de carne picada' }))

    expect(useOrderStore.getState().lines).toMatchObject([{ productId: product('Empanada de carne picada').id, quantity: 1 }])
  })

  it('lists Postres in the category bar and as a section, with Vigilante variants stacked (D6)', () => {
    renderMenu()
    const nav = screen.getByRole('navigation', { name: 'Categorías de la carta' })
    expect(within(nav).getByRole('link', { name: 'Postres' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Postres' })).toBeInTheDocument()
    expect(menu().getByRole('button', { name: /^Sumar Vigilante, Membrillo con queso/ })).toBeInTheDocument()
    expect(menu().getByRole('button', { name: /^Sumar Vigilante, Batata con queso/ })).toBeInTheDocument()
  })
})

describe('Armá tu pizza', () => {
  beforeEach(() => resetOrderStore())

  async function openBuilder() {
    renderMenu()
    fireEvent.click(screen.getByRole('button', { name: /Armá tu pizza/ }))
    return screen.findByRole('dialog', { name: 'Armá tu pizza' })
  }

  it('adds one flavor as a half pizza at the half price (D2)', async () => {
    const sheet = await openBuilder()
    expect(within(sheet).getByText('Elegí el primer gusto')).toBeInTheDocument()
    expect(within(sheet).getByRole('button', { name: 'Elegí al menos un gusto' })).toBeDisabled()

    fireEvent.click(within(sheet).getByRole('button', { name: /^Muzzarella/ }))
    expect(within(sheet).getByText('Media pizza')).toBeInTheDocument()
    fireEvent.click(within(sheet).getByRole('button', { name: /^Agregar media pizza\s*\$\s10\.500/ }))

    expect(useOrderStore.getState().lines).toMatchObject([
      { kind: 'product', productId: product('Muzzarella').id, variantId: variantId('Muzzarella', 'Media'), quantity: 1 },
    ])
    await sheetsClosed()
  })

  it('adds two flavors as a half-and-half priced as both halves, never repeating a flavor (D2, D3, RN-10)', async () => {
    const sheet = await openBuilder()
    fireEvent.click(within(sheet).getByRole('button', { name: /^Muzzarella/ }))

    const taken = within(sheet).getByRole('button', { name: /^Muzzarella.*En la otra mitad/ })
    expect(taken).toBeDisabled()

    fireEvent.click(within(sheet).getByRole('button', { name: /^Napolitana Heraldo/ }))
    expect(within(sheet).getByText('Mitad y mitad')).toBeInTheDocument()
    expectPrice(sheet, '$ 10.500 + $ 14.500 = $ 25.000', 'Mitad y mitad: $ 10.500 + $ 14.500 = $ 25.000')
    fireEvent.click(within(sheet).getByRole('button', { name: /^Agregar mitad y mitad\s*\$\s25\.000/ }))

    expect(useOrderStore.getState().lines).toMatchObject([
      { kind: 'half', firstProductId: product('Muzzarella').id, secondProductId: product('Napolitana Heraldo').id },
    ])
    await sheetsClosed()
  })

  it('promotes the second flavor when the first is cleared, and updates mode and price', async () => {
    const sheet = await openBuilder()
    fireEvent.click(within(sheet).getByRole('button', { name: /^Muzzarella/ }))
    fireEvent.click(within(sheet).getByRole('button', { name: /^Napolitana Heraldo/ }))

    fireEvent.click(within(sheet).getByRole('button', { name: 'Quitar Muzzarella de la 1ª mitad' }))

    expect(within(sheet).getByText('Media pizza')).toBeInTheDocument()
    expectPrice(sheet, '$ 14.500', 'Media pizza: $ 14.500')
    expect(within(sheet).getByRole('button', { name: '1ª mitad: Napolitana Heraldo' })).toBeInTheDocument()
  })
})

describe('CategoryBar', () => {
  it('marks the active category for assistive tech', () => {
    render(
      <CategoryBar
        items={[
          { id: 'a', label: 'Pizzas' },
          { id: 'b', label: 'Empanadas' },
        ]}
        activeId="b"
        onSelect={() => {}}
        onOpenIndex={() => {}}
      />,
    )

    const nav = screen.getByRole('navigation', { name: 'Categorías de la carta' })
    expect(within(nav).getByRole('link', { name: 'Empanadas' })).toHaveAttribute('aria-current', 'true')
    expect(within(nav).getByRole('link', { name: 'Pizzas' })).not.toHaveAttribute('aria-current')
    expect(within(nav).getByRole('button', { name: 'Categorías' })).toBeInTheDocument()
  })
})

describe('primary action buttons (S4)', () => {
  it('put the amount on its own right-aligned element, never joined to the label with a dot', () => {
    const product = prototypeProducts.find((item) => item.name === 'Muzzarella')!
    render(<ProductSheet product={product} onClose={() => {}} />)

    const button = within(screen.getByRole('dialog', { name: /Muzzarella/ })).getByRole('button', { name: /^Agregar/ })
    expect(button.textContent).not.toContain('·')
    expect(button.querySelector('.type-price')).toHaveTextContent(/16\.000/)
  })
})
