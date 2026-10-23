import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PublicMenu } from '@/app/PublicMenu'
import { prototypeCategories, prototypeProducts } from '@/data/prototype-catalog'
import type { Catalog, CatalogRepository } from '@/domain/catalog'
import { resetOrderStore } from '@/features/cart/order-store'
import { resetCheckoutStore } from './checkout-store'
import { VERIFICATION_TTL_MS } from './order-verification'

// Codex P2 on PR #31: a price change waiting for acceptance expires like a verified order (10 minutes, or midnight in
// Argentina). An expired acceptance never becomes «verified», not even for one render, and checking again keeps what
// the customer saw before, so a price change that still holds must still be accepted. The WhatsApp setting is on
// here only to prove the link stays blocked; jsdom never navigates.
vi.mock('./whatsapp', async (original) => ({ ...(await original<typeof import('./whatsapp')>()), isWhatsAppEnabled: () => true }))

const catalogA: Catalog = { categories: prototypeCategories, products: prototypeProducts, promotions: [] }
const priced = (price: number): Catalog => ({
  ...catalogA,
  products: prototypeProducts.map((product) =>
    product.name === 'Muzzarella'
      ? { ...product, variants: product.variants.map((v) => (v.name === 'Entera' ? { ...v, price } : v)) }
      : product,
  ),
})

interface Pending {
  resolve: (catalog: Catalog) => void
  reject: (error: unknown) => void
}

function controlledRepository() {
  const calls: Pending[] = []
  const repository: CatalogRepository = {
    load: vi.fn(
      (signal?: AbortSignal) =>
        new Promise<Catalog>((resolve, reject) => {
          calls.push({ resolve, reject })
          signal?.addEventListener('abort', () => reject(signal.reason), { once: true })
        }),
    ),
  }
  return { repository, calls }
}

const sheet = () => screen.getByRole('dialog', { name: /Tu pedido|Tus datos|Revisá el mensaje/ })
const bubble = () => within(sheet()).queryByTestId('mensaje-whatsapp')
const link = () => screen.queryByRole('link', { name: 'Continuar en WhatsApp' })
const changes = () => within(sheet()).queryByRole('region', { name: 'Cambiaron precios' })
const accept = () => fireEvent.click(within(sheet()).getByRole('button', { name: 'Aceptar el total actualizado' }))
const EXPIRED = 'La verificación venció. Verificá tu pedido de nuevo para continuar.'

/** Builds an order and opens the message on a price change from $ 16.000 to $ 17.000, at `start`. */
async function pendingChange(start: string) {
  vi.setSystemTime(new Date(start))
  const { repository, calls } = controlledRepository()
  const view = render(<PublicMenu repository={repository} />)
  await act(async () => calls[0].resolve(catalogA))
  fireEvent.click(screen.getByRole('button', { name: /^Sumar Muzzarella, Entera/ }))
  fireEvent.click(screen.getByRole('button', { name: /^Ver tu pedido/ }))
  fireEvent.click(within(sheet()).getByRole('button', { name: 'Continuar' }))
  fireEvent.change(within(sheet()).getByLabelText('Nombre y apellido'), { target: { value: 'Ana Gómez' } })
  fireEvent.click(within(sheet()).getByRole('radio', { name: 'Retiro' }))
  fireEvent.click(within(sheet()).getByRole('radio', { name: 'Efectivo' }))
  fireEvent.click(screen.getByRole('button', { name: /^Ver mensaje/ }))
  await act(async () => calls[1].resolve(priced(17000)))
  expect(changes()).toHaveTextContent('$ 16.000 → $ 17.000')
  return { repository, calls, view }
}

const back = () => fireEvent.click(within(sheet()).getByRole('button', { name: 'Volver al paso anterior' }))
const seeMessage = () => fireEvent.click(screen.getByRole('button', { name: /^Ver mensaje/ }))

/** Builds an order paid in cash and verifies it with no change, at `start`. */
async function verifiedInCash(start: string) {
  vi.setSystemTime(new Date(start))
  const { repository, calls } = controlledRepository()
  render(<PublicMenu repository={repository} />)
  await act(async () => calls[0].resolve(catalogA))
  fireEvent.click(screen.getByRole('button', { name: /^Sumar Muzzarella, Entera/ }))
  fireEvent.click(screen.getByRole('button', { name: /^Ver tu pedido/ }))
  fireEvent.click(within(sheet()).getByRole('button', { name: 'Continuar' }))
  fireEvent.change(within(sheet()).getByLabelText('Nombre y apellido'), { target: { value: 'Ana Gómez' } })
  fireEvent.click(within(sheet()).getByRole('radio', { name: 'Retiro' }))
  fireEvent.click(within(sheet()).getByRole('radio', { name: 'Efectivo' }))
  seeMessage()
  await act(async () => calls[1].resolve(catalogA))
  expect(bubble()).toHaveTextContent('Pago: Efectivo')
  return { repository, calls }
}

beforeEach(() => {
  resetOrderStore()
  resetCheckoutStore()
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] })
})
afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe('a price change waiting for acceptance expires (Codex P2 on PR #31)', () => {
  it('can be accepted at 9:59, and at 10:00 it expires and offers «Volver a verificar»', async () => {
    await pendingChange('2026-10-24T20:00:00Z')
    act(() => vi.advanceTimersByTime(VERIFICATION_TTL_MS - 1000))
    expect(changes()).not.toBeNull()
    expect(link()).toBeNull()

    act(() => vi.advanceTimersByTime(1000))
    expect(changes()).toBeNull()
    expect(within(sheet()).getByRole('status')).toHaveTextContent(EXPIRED)
    expect(within(sheet()).getByRole('button', { name: 'Volver a verificar' })).toBeInTheDocument()
    expect(bubble()).toBeNull()
    expect(link()).toBeNull()
  })

  it('accepted just before 10:00, verifies and shows the updated message', async () => {
    await pendingChange('2026-10-24T20:00:00Z')
    act(() => vi.advanceTimersByTime(VERIFICATION_TTL_MS - 1000))
    accept()
    expect(bubble()).toHaveTextContent('$ 17.000')
    expect(link()).not.toBeNull()
  })

  it('refuses an acceptance at the limit even before the expiry timer runs, never showing the message', async () => {
    await pendingChange('2026-10-24T20:00:00Z')
    // The clock reaches 10 minutes but no timer has fired yet: accept() itself must refuse.
    vi.setSystemTime(new Date(Date.parse('2026-10-24T20:00:00Z') + VERIFICATION_TTL_MS))
    const seen: boolean[] = []
    const observer = new MutationObserver(() => seen.push(bubble() !== null || link() !== null))
    observer.observe(document.body, { childList: true, subtree: true })
    accept()
    observer.disconnect()

    expect(seen).not.toContain(true)
    expect(bubble()).toBeNull()
    expect(link()).toBeNull()
    expect(within(sheet()).getByRole('button', { name: 'Volver a verificar' })).toBeInTheDocument()
  })

  it('refuses an acceptance after midnight in Argentina, though under 10 minutes passed', async () => {
    await pendingChange('2026-10-25T02:55:00Z') // 23:55 in Argentina
    vi.setSystemTime(new Date('2026-10-25T03:01:00Z')) // 00:01, six minutes later
    accept()
    expect(bubble()).toBeNull()
    expect(link()).toBeNull()
    expect(within(sheet()).getByRole('status')).toHaveTextContent(EXPIRED)
  })

  it('expires on its own at midnight in Argentina, before the 10 minutes', async () => {
    await pendingChange('2026-10-25T02:55:00Z') // 23:55 in Argentina
    act(() => vi.advanceTimersByTime(5 * 60 * 1000 - 1))
    expect(changes()).not.toBeNull()
    act(() => vi.advanceTimersByTime(1))
    expect(within(sheet()).getByRole('status')).toHaveTextContent(EXPIRED)
  })

  it('checking again keeps the change pending while the new price still holds, then accepts only the new total', async () => {
    const { calls, repository } = await pendingChange('2026-10-24T20:00:00Z')
    act(() => vi.advanceTimersByTime(VERIFICATION_TTL_MS))
    fireEvent.click(within(sheet()).getByRole('button', { name: 'Volver a verificar' }))
    await act(async () => calls[2].resolve(priced(17000)))

    expect(repository.load).toHaveBeenCalledTimes(3)
    expect(changes()).toHaveTextContent('1 × Muzzarella (Entera): $ 16.000 → $ 17.000')
    expect(bubble()).toBeNull()
    expect(link()).toBeNull()
    accept()
    expect(bubble()).toHaveTextContent('$ 17.000')
    expect(link()).not.toBeNull()
  })

  it('keeps the change pending through a failed or timed-out new check', async () => {
    const { calls } = await pendingChange('2026-10-24T20:00:00Z')
    act(() => vi.advanceTimersByTime(VERIFICATION_TTL_MS))
    fireEvent.click(within(sheet()).getByRole('button', { name: 'Volver a verificar' }))
    await act(async () => calls[2].reject(new TypeError('Failed to fetch')))
    fireEvent.click(within(sheet()).getByRole('button', { name: 'Reintentar' }))
    act(() => vi.advanceTimersByTime(20_000))
    fireEvent.click(within(sheet()).getByRole('button', { name: 'Reintentar' }))
    await act(async () => calls[4].resolve(priced(17000)))
    expect(changes()).toHaveTextContent('$ 16.000 → $ 17.000')
    expect(link()).toBeNull()
  })

  it('asks for nothing when the price went back to the one the customer saw', async () => {
    const { calls } = await pendingChange('2026-10-24T20:00:00Z')
    act(() => vi.advanceTimersByTime(VERIFICATION_TTL_MS))
    fireEvent.click(within(sheet()).getByRole('button', { name: 'Volver a verificar' }))
    await act(async () => calls[2].resolve(catalogA))
    expect(changes()).toBeNull()
    expect(bubble()).toHaveTextContent('1 × Muzzarella (Entera): $ 16.000')
    expect(link()).not.toBeNull()
  })

  it('keeps asking to accept a total changed by the payment after it expires and is checked again (Codex P2 on PR #31)', async () => {
    const { calls, repository } = await verifiedInCash('2026-10-24T20:00:00Z')
    back()
    fireEvent.click(within(sheet()).getByRole('radio', { name: /^Crédito/ }))
    seeMessage()
    expect(within(sheet()).getByRole('region', { name: 'Cambió el total' })).toHaveTextContent('$ 16.000 → $ 17.280')
    act(() => vi.advanceTimersByTime(VERIFICATION_TTL_MS))
    fireEvent.click(within(sheet()).getByRole('button', { name: 'Volver a verificar' }))
    await act(async () => calls[2].resolve(catalogA))

    expect(repository.load).toHaveBeenCalledTimes(3)
    expect(within(sheet()).getByRole('region', { name: 'Cambió el total' })).toHaveTextContent('$ 16.000 → $ 17.280')
    expect(bubble()).toBeNull()
    expect(link()).toBeNull()
    accept()
    expect(bubble()).toHaveTextContent('Recargo crédito 8 %: $ 1.280')
  })

  it('asks for nothing when the payment goes back to the one already accepted (Codex P2 on PR #31)', async () => {
    const { repository } = await verifiedInCash('2026-10-24T20:00:00Z')
    back()
    fireEvent.click(within(sheet()).getByRole('radio', { name: /^Crédito/ }))
    seeMessage()
    expect(within(sheet()).getByRole('region', { name: 'Cambió el total' })).toBeInTheDocument()
    back()
    fireEvent.click(within(sheet()).getByRole('radio', { name: 'Efectivo' }))
    seeMessage()

    expect(within(sheet()).queryByRole('region', { name: 'Cambió el total' })).toBeNull()
    expect(bubble()).toHaveTextContent('Pago: Efectivo')
    expect(link()).not.toBeNull()
    expect(repository.load).toHaveBeenCalledTimes(2)
  })

  it('leaves no timer behind once unmounted', async () => {
    const { view } = await pendingChange('2026-10-24T20:00:00Z')
    view.unmount()
    expect(vi.getTimerCount()).toBe(0)
  })
})
