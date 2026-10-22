import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { Storefront } from '@/app/Storefront'
import { prototypeCategories, prototypeProducts } from '@/data/prototype-catalog'
import type { Product } from '@/domain/catalog'
import { CatalogContext, createCatalogData } from '@/features/catalog/catalog-context'
import { OrderSheet } from './OrderSheet'
import { resetOrderStore, useOrderStore } from './order-store'

// P2: lines the current catalog cannot price stay in the order, are shown for review, and block the checkout.

const product = (name: string): Product => {
  const found = prototypeProducts.find((item) => item.name === name)
  if (!found) throw new Error(name)
  return found
}
const add = (name: string, variantName: string, quantity = 1) => {
  const item = product(name)
  const variant = item.variants.find((candidate) => candidate.name === variantName)
  if (!variant) throw new Error(variantName)
  useOrderStore.getState().add({ kind: 'product', productId: item.id, variantId: variant.id, quantity, note: '' })
}
const addGone = () =>
  useOrderStore.getState().add({ kind: 'product', productId: 'borrado', variantId: 'borrado:1', quantity: 1, note: 'sin sal' })
const addGonePromo = () => useOrderStore.getState().add({ kind: 'promotion', promotionId: 'promo-vieja', quantity: 1, note: '' })

const renderMenu = (products = prototypeProducts) =>
  render(<Storefront categories={prototypeCategories} products={products} promotions={[]} />)

async function openCart() {
  fireEvent.click(screen.getByRole('button', { name: /^Ver tu pedido/ }))
  return screen.findByRole('dialog', { name: 'Tu pedido' })
}

describe('cart with lines the catalog cannot price (P2)', () => {
  beforeEach(() => resetOrderStore())

  it('keeps the cart reachable when every line has an issue, and lists each one with its reason', async () => {
    addGone()
    addGonePromo()
    add('Café cortado', 'Unidad')
    renderMenu()

    expect(screen.getByRole('button', { name: /^Ver tu pedido: 0 productos, \$\s0, 3 para revisar/ })).toBeInTheDocument()
    const sheet = await openCart()
    const review = within(sheet).getByRole('region', { name: 'Revisá estos productos' })

    expect(within(review).getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      expect.stringMatching(/^Un producto que ya no está en la carta.*Ya no está en la carta\..*Aclaración: sin sal/),
      expect.stringMatching(/^Una promo que ya no está en la carta.*Ya no está en la carta\./),
      expect.stringMatching(/^Café cortado.*Se consulta en barra: no se puede pedir por acá\./),
    ])
    expect(within(sheet).queryByText(/Tu pedido está vacío/)).not.toBeInTheDocument()
    expect(within(sheet).getByRole('button', { name: 'Continuar' })).toBeDisabled()
    expect(within(sheet).getByText('Quitá los productos marcados para continuar.')).toBeInTheDocument()
  })

  it('prices only the valid lines and blocks the checkout until the issues are removed', async () => {
    add('Muzzarella', 'Entera', 2)
    addGone()
    renderMenu()

    const sheet = await openCart()
    expect(within(sheet).getByText('$ 32.000', { selector: '.type-price.text-\\[1\\.25rem\\]' })).toBeInTheDocument()
    expect(within(sheet).getByRole('button', { name: 'Continuar' })).toBeDisabled()

    fireEvent.click(within(sheet).getByRole('button', { name: 'Quitar Un producto que ya no está en la carta del pedido' }))

    expect(useOrderStore.getState().lines).toHaveLength(1)
    expect(within(sheet).queryByRole('region', { name: 'Revisá estos productos' })).not.toBeInTheDocument()
    expect(within(sheet).getByRole('button', { name: 'Continuar' })).toBeEnabled()
  })

  it('shows an out-of-stock line as an issue, without its price, and keeps it in the order', async () => {
    add('Muzzarella', 'Entera')
    add('Especial', 'Entera')
    renderMenu(prototypeProducts.map((item) => (item.name === 'Muzzarella' ? { ...item, inStock: false } : item)))

    const sheet = await openCart()
    const review = within(sheet).getByRole('region', { name: 'Revisá estos productos' })

    expect(within(review).getByRole('listitem')).toHaveTextContent(/^Muzzarella\s*Entera\s*Sin stock por ahora\./)
    expect(within(review).queryByText(/\$/)).not.toBeInTheDocument()
    expect(useOrderStore.getState().lines).toHaveLength(2)
  })

  it('never shows the details or the message step while there are issues, whatever step is requested', () => {
    add('Muzzarella', 'Entera')
    addGone()
    const catalog = createCatalogData(prototypeCategories, prototypeProducts, [])

    render(
      <CatalogContext value={catalog}>
        <OrderSheet step="details" onClose={() => undefined} />
      </CatalogContext>,
    )

    const sheet = screen.getByRole('dialog', { name: 'Tu pedido' })
    expect(within(sheet).getByText('Paso 1 de 3')).toBeInTheDocument()
    expect(within(sheet).queryByRole('textbox', { name: /Nombre/ })).not.toBeInTheDocument()
  })

  it('disables the desktop panel action too', () => {
    add('Muzzarella', 'Entera')
    addGone()
    renderMenu()

    const panel = screen.getByRole('complementary', { name: 'Tu pedido' })
    expect(within(panel).getByRole('region', { name: 'Revisá estos productos' })).toBeInTheDocument()
    expect(within(panel).getByRole('button', { name: 'Continuar' })).toBeDisabled()
  })
})
