import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PublicMenu } from '@/app/PublicMenu'
import { prototypeCategories, prototypeProducts } from '@/data/prototype-catalog'
import type { Catalog, CatalogRepository } from '@/domain/catalog'
import { resetOrderStore, useOrderStore } from '@/features/cart/order-store'
import { resetCheckoutStore } from './checkout-store'

// P6a-3, end to end inside the app: «Ver mensaje» refreshes the catalog once, P2 reconciles the order against it,
// and the message step opens only for an order that is still valid, with any price change accepted first.

const catalogA: Catalog = { categories: prototypeCategories, products: prototypeProducts, promotions: [] }
const muzzaPriced = (price: number, inStock = true): Catalog => ({
  ...catalogA,
  products: prototypeProducts.map((product) =>
    product.name === 'Muzzarella'
      ? { ...product, inStock, variants: product.variants.map((v) => (v.name === 'Entera' ? { ...v, price } : v)) }
      : product,
  ),
})

interface Pending {
  resolve: (catalog: Catalog) => void
  reject: (error: unknown) => void
  signal?: AbortSignal
}

function controlledRepository() {
  const calls: Pending[] = []
  const repository: CatalogRepository = {
    load: vi.fn(
      (signal?: AbortSignal) =>
        new Promise<Catalog>((resolve, reject) => {
          calls.push({ resolve, reject, signal })
          signal?.addEventListener('abort', () => reject(signal.reason), { once: true })
        }),
    ),
  }
  return { repository, calls }
}

const sheet = () => screen.getByRole('dialog', { name: /Tu pedido|Tus datos|Revisá el mensaje/ })
const heading = () => within(sheet()).getByRole('heading', { level: 2 }).textContent

async function openDetails(payment: 'Efectivo' | 'Crédito' = 'Efectivo') {
  const { repository, calls } = controlledRepository()
  render(<PublicMenu repository={repository} />)
  await act(async () => calls[0].resolve(catalogA))
  fireEvent.click(screen.getByRole('button', { name: /^Sumar Muzzarella, Entera/ }))
  fireEvent.click(screen.getByRole('button', { name: /^Ver tu pedido/ }))
  fireEvent.click(within(screen.getByRole('dialog', { name: 'Tu pedido' })).getByRole('button', { name: 'Continuar' }))
  fireEvent.change(within(sheet()).getByLabelText('Nombre y apellido'), { target: { value: 'Ana Gómez' } })
  fireEvent.click(within(sheet()).getByRole('radio', { name: 'Retiro' }))
  fireEvent.click(within(sheet()).getByRole('radio', { name: new RegExp(`^${payment}`) }))
  return { repository, calls }
}

const seeMessage = () => fireEvent.click(screen.getByRole('button', { name: /^Ver mensaje/ }))
const back = () => fireEvent.click(within(sheet()).getByRole('button', { name: 'Volver al paso anterior' }))
const bubble = () => within(sheet()).queryByTestId('mensaje-whatsapp')

beforeEach(() => {
  resetOrderStore()
  resetCheckoutStore()
})
afterEach(() => vi.useRealTimers())

describe('final check before WhatsApp (P6a-3)', () => {
  it('checks once with a fresh catalog and opens the message when nothing changed', async () => {
    const { repository, calls } = await openDetails()
    const button = screen.getByRole('button', { name: /^Ver mensaje/ })
    fireEvent.click(button)
    fireEvent.click(button) // a double tap starts a single check
    expect(within(sheet()).getByRole('status')).toHaveTextContent('Verificando precios y disponibilidad…')
    expect(bubble()).toBeNull()
    await act(async () => calls[1].resolve(catalogA))

    expect(heading()).toBe('Revisá el mensaje')
    expect(bubble()).toHaveTextContent('1 × Muzzarella (Entera): $ 16.000')
    expect(repository.load).toHaveBeenCalledTimes(2)
  })

  it('shows a price change, before and after, and opens the message only after the new total is accepted', async () => {
    const { calls } = await openDetails()
    seeMessage()
    await act(async () => calls[1].resolve(muzzaPriced(17000)))

    const changes = within(sheet()).getByRole('region', { name: 'Cambiaron precios' })
    expect(within(changes).getByRole('listitem')).toHaveTextContent('1 × Muzzarella (Entera): $ 16.000 → $ 17.000')
    expect(changes).toHaveTextContent('Total orientativo: $ 16.000 → $ 17.000')
    expect(bubble()).toBeNull()
    fireEvent.click(within(sheet()).getByRole('button', { name: 'Aceptar el total actualizado' }))
    expect(bubble()).toHaveTextContent('1 × Muzzarella (Entera): $ 17.000')
  })

  it('keeps a price change pending acceptance when the customer goes back and opens the message again', async () => {
    const { repository, calls } = await openDetails()
    seeMessage()
    await act(async () => calls[1].resolve(muzzaPriced(17000)))
    back()
    seeMessage()

    expect(repository.load).toHaveBeenCalledTimes(2)
    const changes = within(sheet()).getByRole('region', { name: 'Cambiaron precios' })
    expect(within(changes).getByRole('listitem')).toHaveTextContent('1 × Muzzarella (Entera): $ 16.000 → $ 17.000')
    expect(bubble()).toBeNull()
    fireEvent.click(within(sheet()).getByRole('button', { name: 'Aceptar el total actualizado' }))
    expect(bubble()).toHaveTextContent('$ 17.000')
  })

  it('shows an unaccepted change again when it expired before the customer came back', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-10-24T20:00:00Z'))
    const { repository, calls } = await openDetails()
    seeMessage()
    await act(async () => calls[1].resolve(muzzaPriced(17000)))
    back()
    vi.setSystemTime(new Date('2026-10-24T20:11:00Z'))
    seeMessage()
    expect(repository.load).toHaveBeenCalledTimes(3)
    await act(async () => calls[2].resolve(muzzaPriced(17000)))
    expect(within(sheet()).getByRole('region', { name: 'Cambiaron precios' })).toHaveTextContent('$ 16.000 → $ 17.000')
    expect(bubble()).toBeNull()
  })

  it('asks to check again, instead of showing nothing, if the order changes while its message is on screen', async () => {
    const { calls } = await openDetails()
    seeMessage()
    await act(async () => calls[1].resolve(catalogA))
    act(() => useOrderStore.getState().setNote(useOrderStore.getState().lines[0].id, 'bien cocida'))

    expect(bubble()).toBeNull()
    expect(within(sheet()).getByRole('status')).toHaveTextContent('Tu pedido cambió mientras lo verificábamos.')
    fireEvent.click(within(sheet()).getByRole('button', { name: 'Verificar de nuevo' }))
    await act(async () => calls[2].resolve(catalogA))
    expect(bubble()).toHaveTextContent('Aclaración: bien cocida')
  })

  it('goes back to the cart, keeping the line, when the fresh catalog makes the order invalid', async () => {
    const { calls } = await openDetails()
    seeMessage()
    await act(async () => calls[1].resolve(muzzaPriced(16000, false)))

    expect(heading()).toBe('Tu pedido')
    const review = within(sheet()).getByRole('region', { name: 'Revisá estos productos' })
    expect(within(review).getByRole('listitem')).toHaveTextContent('Sin stock por ahora.')
    expect(within(sheet()).getByRole('button', { name: 'Continuar' })).toBeDisabled()
  })

  it('blocks on a network failure, keeps what was typed, and «Reintentar» checks again', async () => {
    const { repository, calls } = await openDetails()
    seeMessage()
    await act(async () => calls[1].reject(new TypeError('Failed to fetch')))
    const failure = 'No pudimos verificar tu pedido. Revisá tu conexión e intentá de nuevo.'
    expect(within(sheet()).getByRole('alert')).toHaveTextContent(failure)
    expect(bubble()).toBeNull()

    fireEvent.click(within(sheet()).getByRole('button', { name: 'Reintentar' }))
    await act(async () => calls[2].reject(new TypeError('Failed to fetch')))
    expect(within(sheet()).getByRole('alert')).toHaveTextContent(failure)
    back()
    expect(within(sheet()).getByLabelText('Nombre y apellido')).toHaveValue('Ana Gómez')
    expect(within(sheet()).getByRole('radio', { name: 'Retiro' })).toBeChecked()
    seeMessage()
    await act(async () => calls[3].resolve(catalogA))
    expect(bubble()).toHaveTextContent('Nombre: Ana Gómez')
    expect(repository.load).toHaveBeenCalledTimes(4)
  })

  it('does not let a check started for one cart authorize a cart that changed while it waited', async () => {
    const { calls } = await openDetails()
    seeMessage()
    act(() => {
      const line = useOrderStore.getState().lines[0]
      useOrderStore.getState().increment(line.id)
    })
    await act(async () => calls[1].resolve(catalogA))

    expect(bubble()).toBeNull()
    expect(within(sheet()).getByRole('status')).toHaveTextContent('Tu pedido cambió mientras lo verificábamos.')
    fireEvent.click(within(sheet()).getByRole('button', { name: 'Verificar de nuevo' }))
    await act(async () => calls[2].resolve(catalogA))
    expect(bubble()).toHaveTextContent('2 × Muzzarella (Entera): $ 32.000')
  })

  it('cancels a check when the customer goes back, so its late answer changes nothing', async () => {
    const { calls } = await openDetails()
    seeMessage()
    back()
    expect(calls[1].signal?.aborted).toBe(true)
    seeMessage()
    await act(async () => calls[2].resolve(catalogA))
    await act(async () => calls[1].resolve(muzzaPriced(99000)))
    expect(within(sheet()).queryByRole('region', { name: 'Cambiaron precios' })).toBeNull()
    expect(bubble()).toHaveTextContent('$ 16.000')
  })

  it('cancels a check when the sheet is closed', async () => {
    const { calls } = await openDetails()
    seeMessage()
    fireEvent.click(within(sheet()).getByRole('button', { name: 'Cerrar' }))
    expect(calls[1].signal?.aborted).toBe(true)
    // Closing goes back in history asynchronously; wait for it so it cannot reach the next test.
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })

  it('asks to accept again when the payment changes the total after a check, without querying again', async () => {
    const { repository, calls } = await openDetails()
    seeMessage()
    await act(async () => calls[1].resolve(muzzaPriced(17000)))
    fireEvent.click(within(sheet()).getByRole('button', { name: 'Aceptar el total actualizado' }))
    back()
    fireEvent.click(within(sheet()).getByRole('radio', { name: /^Crédito/ }))
    seeMessage()

    expect(repository.load).toHaveBeenCalledTimes(2)
    const changes = within(sheet()).getByRole('region', { name: 'Cambió el total' })
    expect(changes).toHaveTextContent('Total orientativo: $ 17.000 → $ 18.360')
    fireEvent.click(within(sheet()).getByRole('button', { name: 'Aceptar el total actualizado' }))
    expect(bubble()).toHaveTextContent('Recargo crédito 8 %: $ 1.360')
  })

  it('checks again when the cart changes after a new price was accepted', async () => {
    const { repository, calls } = await openDetails()
    seeMessage()
    await act(async () => calls[1].resolve(muzzaPriced(17000)))
    fireEvent.click(within(sheet()).getByRole('button', { name: 'Aceptar el total actualizado' }))
    act(() => useOrderStore.getState().increment(useOrderStore.getState().lines[0].id))
    back()
    seeMessage()

    expect(repository.load).toHaveBeenCalledTimes(3)
    await act(async () => calls[2].resolve(muzzaPriced(17000)))
    expect(bubble()).toHaveTextContent('2 × Muzzarella (Entera): $ 34.000')
  })

  it('reuses a check under 10 minutes old on the same day, and checks again past them or past midnight', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-10-25T02:50:00Z')) // 23:50 in Argentina
    const { repository, calls } = await openDetails()
    seeMessage()
    await act(async () => calls[1].resolve(catalogA))
    back()
    vi.setSystemTime(new Date('2026-10-25T02:55:00Z'))
    seeMessage()
    expect(repository.load).toHaveBeenCalledTimes(2)
    expect(bubble()).not.toBeNull()

    back()
    vi.setSystemTime(new Date('2026-10-25T03:01:00Z')) // 00:01: a new day in Argentina, 11 minutes later
    seeMessage()
    expect(repository.load).toHaveBeenCalledTimes(3)
  })

  it('marks a check as expired after 10 minutes on the message step', async () => {
    vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'] })
    const { calls } = await openDetails()
    seeMessage()
    await act(async () => calls[1].resolve(catalogA))
    expect(bubble()).not.toBeNull()
    act(() => vi.advanceTimersByTime(10 * 60 * 1000))

    expect(within(sheet()).getByRole('status')).toHaveTextContent('La verificación venció. Verificá tu pedido de nuevo para continuar.')
    expect(bubble()).toBeNull()
    fireEvent.click(within(sheet()).getByRole('button', { name: 'Verificar de nuevo' }))
    await act(async () => calls[2].resolve(catalogA))
    expect(bubble()).not.toBeNull()
  })
})
