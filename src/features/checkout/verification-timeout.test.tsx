import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PublicMenu } from '@/app/PublicMenu'
import { prototypeCategories, prototypeProducts } from '@/data/prototype-catalog'
import type { Catalog, CatalogRepository } from '@/domain/catalog'
import { resetOrderStore, useOrderStore } from '@/features/cart/order-store'
import { resetCheckoutStore, useCheckoutStore } from './checkout-store'
import { VERIFICATION_TIMEOUT_MS } from './useOrderVerification'

// P6 resilience: the final check never waits forever. After 20 seconds it fails in a recoverable way, even if the
// request ignores the abort, and nothing that arrives later counts. The WhatsApp setting is switched on here only to
// prove the link stays blocked; jsdom never navigates and nothing reaches WhatsApp.
vi.mock('./whatsapp', async (original) => ({ ...(await original<typeof import('./whatsapp')>()), isWhatsAppEnabled: () => true }))

const catalogA: Catalog = { categories: prototypeCategories, products: prototypeProducts, promotions: [] }
const repriced: Catalog = {
  ...catalogA,
  products: prototypeProducts.map((product) =>
    product.name === 'Muzzarella'
      ? { ...product, variants: product.variants.map((v) => (v.name === 'Entera' ? { ...v, price: 99000 } : v)) }
      : product,
  ),
}

interface Pending {
  resolve: (catalog: Catalog) => void
  signal?: AbortSignal
}

/** A repository whose answers the test controls; it ignores aborts on purpose, like a request that never settles. */
function deafRepository() {
  const calls: Pending[] = []
  const repository: CatalogRepository = {
    load: vi.fn((signal?: AbortSignal) => new Promise<Catalog>((resolve) => calls.push({ resolve, signal }))),
  }
  return { repository, calls }
}

const sheet = () => screen.getByRole('dialog', { name: /Tu pedido|Tus datos|Revisá el mensaje/ })
const bubble = () => within(sheet()).queryByTestId('mensaje-whatsapp')
const whatsappLink = () => screen.queryByRole('link', { name: 'Continuar en WhatsApp' })
const TIMEOUT = 'La verificación tardó demasiado. Revisá tu conexión e intentá de nuevo.'

async function openMessage() {
  const { repository, calls } = deafRepository()
  const view = render(<PublicMenu repository={repository} />)
  await act(async () => calls[0].resolve(catalogA))
  fireEvent.click(screen.getByRole('button', { name: /^Sumar Muzzarella, Entera/ }))
  fireEvent.click(screen.getByRole('button', { name: /^Ver tu pedido/ }))
  act(() => useOrderStore.getState().setNote(useOrderStore.getState().lines[0].id, 'bien cocida'))
  fireEvent.click(within(sheet()).getByRole('button', { name: 'Continuar' }))
  fireEvent.change(within(sheet()).getByLabelText('Nombre y apellido'), { target: { value: 'Ana Gómez' } })
  fireEvent.click(within(sheet()).getByRole('radio', { name: 'Retiro' }))
  fireEvent.click(within(sheet()).getByRole('radio', { name: /^Crédito/ }))
  fireEvent.click(screen.getByRole('button', { name: /^Ver mensaje/ }))
  return { repository, calls, view }
}

beforeEach(() => {
  resetOrderStore()
  resetCheckoutStore()
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] })
})
// Spies (console.error, window.open) and fake timers end with each test, so no test depends on the order they run.
afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe('time limit of the final check (P6)', () => {
  it('is 20 seconds', () => {
    expect(VERIFICATION_TIMEOUT_MS).toBe(20_000)
  })

  it('fails in a recoverable way after 20 seconds of a request that never answers, keeping everything and WhatsApp blocked', async () => {
    const { calls } = await openMessage()
    act(() => vi.advanceTimersByTime(VERIFICATION_TIMEOUT_MS - 1))
    expect(within(sheet()).getByRole('status')).toHaveTextContent('Verificando precios y disponibilidad…')
    expect(whatsappLink()).toBeNull()

    act(() => vi.advanceTimersByTime(1))
    expect(within(sheet()).getByRole('alert')).toHaveTextContent(TIMEOUT)
    expect(within(sheet()).getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
    expect(bubble()).toBeNull()
    expect(whatsappLink()).toBeNull()
    expect(screen.getByRole('button', { name: 'Continuar en WhatsApp' })).toBeDisabled()
    expect(calls[1].signal?.aborted).toBe(true)

    // Nothing typed or chosen was lost.
    const [line] = useOrderStore.getState().lines
    expect(line).toMatchObject({ quantity: 1, note: 'bien cocida' })
    expect(useCheckoutStore.getState().details).toMatchObject({ name: 'Ana Gómez', mode: 'retiro', payment: 'credito' })
  })

  it('ignores an answer that arrives after the time limit, and a later «Reintentar» that answers verifies the order', async () => {
    const { calls, repository } = await openMessage()
    act(() => vi.advanceTimersByTime(VERIFICATION_TIMEOUT_MS))
    await act(async () => calls[1].resolve(repriced))

    expect(within(sheet()).getByRole('alert')).toHaveTextContent(TIMEOUT)
    expect(within(sheet()).queryByRole('region', { name: 'Cambiaron precios' })).toBeNull()
    expect(screen.getByRole('button', { name: /^Sumar Muzzarella, Entera, \$\s16\.000/ })).toBeInTheDocument()

    fireEvent.click(within(sheet()).getByRole('button', { name: 'Reintentar' }))
    await act(async () => calls[2].resolve(catalogA))
    expect(bubble()).toHaveTextContent('Aclaración: bien cocida')
    expect(whatsappLink()).not.toBeNull()
    expect(repository.load).toHaveBeenCalledTimes(3)
    // The finished check left no time limit behind: 20 more seconds change nothing.
    act(() => vi.advanceTimersByTime(VERIFICATION_TIMEOUT_MS))
    expect(bubble()).not.toBeNull()
  })

  it('never reports a time-out for a check the customer cancelled by going back or closing the sheet', async () => {
    const errors = vi.spyOn(console, 'error')
    const { calls, view } = await openMessage()
    fireEvent.click(within(sheet()).getByRole('button', { name: 'Volver al paso anterior' }))
    act(() => vi.advanceTimersByTime(VERIFICATION_TIMEOUT_MS * 2))
    expect(within(sheet()).getByRole('heading', { level: 2, name: 'Tus datos' })).toBeInTheDocument()
    expect(within(sheet()).queryByRole('alert')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: /^Ver mensaje/ }))
    fireEvent.click(within(sheet()).getByRole('button', { name: 'Cerrar' }))
    act(() => vi.advanceTimersByTime(VERIFICATION_TIMEOUT_MS * 2))
    await act(async () => calls[2].resolve(repriced))
    expect(calls[2].signal?.aborted).toBe(true)
    view.unmount()
    act(() => vi.advanceTimersByTime(VERIFICATION_TIMEOUT_MS * 2))
    expect(vi.getTimerCount()).toBe(0)
    expect(errors).not.toHaveBeenCalled()
  })

  it('lets only the newest of two checks count when they answer in reverse order', async () => {
    const { calls } = await openMessage()
    fireEvent.click(within(sheet()).getByRole('button', { name: 'Volver al paso anterior' }))
    fireEvent.click(screen.getByRole('button', { name: /^Ver mensaje/ }))
    await act(async () => calls[2].resolve(catalogA))
    await act(async () => calls[1].resolve(repriced))
    act(() => vi.advanceTimersByTime(VERIFICATION_TIMEOUT_MS))

    expect(bubble()).toHaveTextContent('$ 16.000')
    expect(within(sheet()).queryByRole('alert')).toBeNull()
  })
})

describe('what the order step says when the order changed (P6)', () => {
  it('tells a change after the last check apart from a change during it', async () => {
    const { calls } = await openMessage()
    await act(async () => calls[1].resolve(catalogA))
    act(() => useOrderStore.getState().setNote(useOrderStore.getState().lines[0].id, 'a punto'))
    expect(within(sheet()).getByRole('status')).toHaveTextContent('El pedido cambió después de la última verificación.')
    expect(whatsappLink()).toBeNull()
  })
})
