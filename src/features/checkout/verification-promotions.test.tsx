import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PublicMenu } from '@/app/PublicMenu'
import { prototypeCategories, prototypeProducts } from '@/data/prototype-catalog'
import { prototypePromotions } from '@/data/prototype-promotions'
import type { Catalog, CatalogRepository } from '@/domain/catalog'
import type { NewOrderLine } from '@/features/cart/order-lines'
import { resetOrderStore, useOrderStore } from '@/features/cart/order-store'
import { resetCheckoutStore } from './checkout-store'

// P6b-2 audit: the final check before WhatsApp with promotions and the personalized dozen. P2 decides availability;
// these tests prove the check sends the customer back to the cart, keeping the line, when the fresh catalog no
// longer has a promotion or one of the dozen's flavors, and that the dozen's flavors reach the message.

const product = (name: string) => prototypeProducts.find((item) => item.name === name)!
const carne = product('Empanada de carne picada')
const jyq = product('Empanada de jamón y queso')
const pollo = product('Empanada de pollo')

const catalogWith = (changes: Partial<Catalog> = {}): Catalog => ({
  categories: prototypeCategories,
  products: prototypeProducts,
  promotions: prototypePromotions,
  ...changes,
})

interface Pending {
  resolve: (catalog: Catalog) => void
}

function controlledRepository() {
  const calls: Pending[] = []
  const repository: CatalogRepository = {
    load: vi.fn(
      (signal?: AbortSignal) =>
        new Promise<Catalog>((resolve, reject) => {
          calls.push({ resolve })
          signal?.addEventListener('abort', () => reject(signal.reason), { once: true })
        }),
    ),
  }
  return { repository, calls }
}

const sheet = () => screen.getByRole('dialog', { name: /Tu pedido|Tus datos|Revisá el mensaje/ })
const bubble = () => within(sheet()).queryByTestId('mensaje-whatsapp')

/** Opens the order with the given promotion lines already in the cart, at the details step, paid in cash on pickup. */
async function openWith(lines: NewOrderLine[]) {
  const { repository, calls } = controlledRepository()
  render(<PublicMenu repository={repository} />)
  await act(async () => calls[0].resolve(catalogWith()))
  act(() => lines.forEach((line) => useOrderStore.getState().add(line)))
  fireEvent.click(screen.getByRole('button', { name: /^Ver tu pedido/ }))
  fireEvent.click(within(sheet()).getByRole('button', { name: 'Continuar' }))
  fireEvent.change(within(sheet()).getByLabelText('Nombre y apellido'), { target: { value: 'Ana Gómez' } })
  fireEvent.click(within(sheet()).getByRole('radio', { name: 'Retiro' }))
  fireEvent.click(within(sheet()).getByRole('radio', { name: 'Efectivo' }))
  fireEvent.click(screen.getByRole('button', { name: /^Ver mensaje/ }))
  return { repository, calls }
}

const closedCombo: NewOrderLine = { kind: 'promotion', promotionId: 'promo-tres-muzzarella', quantity: 1, note: '' }
const dozen: Extract<NewOrderLine, { kind: 'promotion' }> & { flavors: { productId: string; quantity: number }[] } = {
  kind: 'promotion',
  promotionId: 'promo-docena-eleccion',
  quantity: 1,
  note: '',
  flavors: [
    { productId: carne.id, quantity: 6 },
    { productId: jyq.id, quantity: 4 },
    { productId: pollo.id, quantity: 2 },
  ],
}

beforeEach(() => {
  resetOrderStore()
  resetCheckoutStore()
})
afterEach(() => vi.restoreAllMocks())

describe('final check with promotions and the personalized dozen (P6b-2)', () => {
  it('writes the dozen, its flavors, and the promotion price in the message after a valid check', async () => {
    const { calls } = await openWith([closedCombo, dozen])
    await act(async () => calls[1].resolve(catalogWith()))

    expect(bubble()).toHaveTextContent('1 × Tres pizzas Muzzarella (Promo): $ 42.000')
    expect(bubble()).toHaveTextContent('1 × Docena de empanadas a elección (Promo): $ 36.000')
    expect(bubble()).toHaveTextContent('6 Carne picada')
    expect(bubble()).toHaveTextContent('4 Jamón y queso')
    expect(bubble()).toHaveTextContent('2 Pollo')
    expect(bubble()).toHaveTextContent('Total orientativo: $ 78.000')
  })

  it('goes back to the cart, keeping both lines, when a promotion was switched off or expired', async () => {
    const { calls } = await openWith([closedCombo, dozen])
    await act(async () => calls[1].resolve(catalogWith({ promotions: prototypePromotions.filter((p) => p.id !== 'promo-tres-muzzarella') })))

    expect(within(sheet()).getByRole('heading', { level: 2, name: 'Tu pedido' })).toBeInTheDocument()
    const review = within(sheet()).getByRole('region', { name: 'Revisá estos productos' })
    expect(within(review).getByRole('listitem')).toHaveTextContent('Esta promoción ya no está disponible.')
    expect(useOrderStore.getState().lines).toHaveLength(2)
    expect(within(sheet()).getByRole('button', { name: 'Continuar' })).toBeDisabled()
    expect(bubble()).toBeNull()
  })

  it('goes back to the cart, keeping the line, when a flavor of the dozen ran out of stock', async () => {
    const { calls } = await openWith([dozen])
    const products = prototypeProducts.map((item) => (item.id === jyq.id ? { ...item, inStock: false } : item))
    await act(async () => calls[1].resolve(catalogWith({ products })))

    expect(within(sheet()).getByRole('heading', { level: 2, name: 'Tu pedido' })).toBeInTheDocument()
    expect(within(sheet()).getByRole('region', { name: 'Revisá estos productos' })).toHaveTextContent('Docena de empanadas a elección')
    // The store keeps the flavors sorted by product id; the same three picks are still there, none replaced.
    const [line] = useOrderStore.getState().lines
    expect(line).toMatchObject({ promotionId: 'promo-docena-eleccion', flavors: expect.arrayContaining(dozen.flavors) })
    expect(bubble()).toBeNull()
  })

  it('goes back to the cart when a flavor of the dozen was removed from the catalog', async () => {
    const { calls } = await openWith([dozen])
    await act(async () => calls[1].resolve(catalogWith({ products: prototypeProducts.filter((item) => item.id !== pollo.id) })))

    expect(within(sheet()).getByRole('heading', { level: 2, name: 'Tu pedido' })).toBeInTheDocument()
    expect(within(sheet()).getByRole('region', { name: 'Revisá estos productos' })).toBeInTheDocument()
    expect(useOrderStore.getState().lines).toHaveLength(1)
  })

  it('asks to accept a promotion whose price changed, and the message carries the accepted price', async () => {
    const { calls } = await openWith([closedCombo])
    const repriced = prototypePromotions.map((p) => (p.id === 'promo-tres-muzzarella' ? { ...p, price: 45000 } : p))
    await act(async () => calls[1].resolve(catalogWith({ promotions: repriced })))

    expect(within(sheet()).getByRole('region', { name: 'Cambiaron precios' })).toHaveTextContent('Tres pizzas Muzzarella (Promo): $ 42.000 → $ 45.000')
    expect(bubble()).toBeNull()
    fireEvent.click(within(sheet()).getByRole('button', { name: 'Aceptar el total actualizado' }))
    expect(bubble()).toHaveTextContent('1 × Tres pizzas Muzzarella (Promo): $ 45.000')
  })
})
