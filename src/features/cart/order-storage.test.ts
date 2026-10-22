import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ORDER_STORAGE_KEY } from './order-storage'

// Each `reload()` imports the stores again, as a page reload does: the order store hydrates from localStorage.
async function reload() {
  vi.resetModules()
  const { useOrderStore } = await import('./order-store')
  const { useOrderStorageStatus } = await import('./order-storage')
  const { useCheckoutStore } = await import('@/features/checkout/checkout-store')
  return { useOrderStore, useOrderStorageStatus, useCheckoutStore }
}

const stored = () => localStorage.getItem(ORDER_STORAGE_KEY)
const seed = (value: unknown) => localStorage.setItem(ORDER_STORAGE_KEY, typeof value === 'string' ? value : JSON.stringify(value))

const muzza = { kind: 'product', productId: 'muzza', variantId: 'muzza:entera', quantity: 2, note: 'bien cocida' } as const
const half = { kind: 'half', firstProductId: 'muzza', secondProductId: 'napo', quantity: 1, note: '' } as const
const promo = { kind: 'promotion', promotionId: 'promo-1', quantity: 1, note: 'sin aceitunas' } as const

describe('order persistence (RF-17)', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => vi.restoreAllMocks())

  it('keeps products, variants, half-and-halves, promotions, quantities, and notes across a reload', async () => {
    const first = await reload()
    first.useOrderStore.getState().add(muzza)
    first.useOrderStore.getState().add(half)
    first.useOrderStore.getState().add(promo)

    const { useOrderStore, useOrderStorageStatus } = await reload()

    expect(useOrderStore.getState().lines).toMatchObject([muzza, half, promo])
    expect(useOrderStorageStatus.getState().issue).toBeNull()
  })

  it('saves only the lines, versioned: no ids, prices, feedback counters, or checkout data', async () => {
    const { useOrderStore, useCheckoutStore } = await reload()
    useCheckoutStore.getState().setText('name', 'Ana Pérez')
    useCheckoutStore.getState().setText('address', 'Mitre 123')
    useOrderStore.getState().add(muzza)

    expect(JSON.parse(stored() ?? 'null')).toEqual({ state: { lines: [muzza] }, version: 1 })
    expect(stored()).not.toMatch(/Ana|Mitre|price|linea-|addedCount|lastChange/)
  })

  it('gives every line a unique id after a reload, so new lines never collide with restored ones', async () => {
    const first = await reload()
    first.useOrderStore.getState().add(muzza)
    first.useOrderStore.getState().add(half)

    const { useOrderStore } = await reload()
    useOrderStore.getState().add(promo)

    const ids = useOrderStore.getState().lines.map((line) => line.id)
    expect(new Set(ids).size).toBe(3)
  })

  it('keeps the valid lines and reports how many were discarded', async () => {
    const raw = JSON.stringify({
      state: {
        lines: [
          muzza,
          { ...half, secondProductId: 'muzza' },
          { kind: 'product', productId: 'x', quantity: 1, note: '' },
          { ...promo, quantity: 0 },
          { ...promo, quantity: 1.5 },
          'texto',
          promo,
        ],
      },
      version: 1,
    })
    seed(raw)

    const { useOrderStore, useOrderStorageStatus } = await reload()

    expect(useOrderStore.getState().lines).toMatchObject([muzza, promo])
    expect(useOrderStorageStatus.getState().issue).toEqual({ kind: 'partial', discarded: 5 })
    expect(stored()).toBe(raw)
  })

  it('trims a restored note to the usual limit instead of discarding the line', async () => {
    seed({ state: { lines: [{ ...muzza, note: `  ${'a'.repeat(200)}  ` }] }, version: 1 })

    const { useOrderStore, useOrderStorageStatus } = await reload()

    expect(useOrderStore.getState().lines[0].note).toBe('a'.repeat(120))
    expect(useOrderStorageStatus.getState().issue).toBeNull()
  })

  it.each([
    ['corrupt JSON', '{"state":{"lines":[', 'corrupt'],
    ['an unexpected shape', JSON.stringify({ state: { lines: 'muzza' }, version: 1 }), 'corrupt'],
    ['a missing version', JSON.stringify({ state: { lines: [muzza] } }), 'corrupt'],
    ['another version', JSON.stringify({ state: { lines: [muzza] }, version: 2 }), 'incompatible'],
  ])('starts empty on %s, reports it, and keeps the saved data until the order changes', async (_, raw, kind) => {
    seed(raw)

    const { useOrderStore, useOrderStorageStatus } = await reload()
    expect(useOrderStore.getState().lines).toEqual([])
    expect(useOrderStorageStatus.getState().issue).toEqual({ kind })
    expect(stored()).toBe(raw)

    // Changes that leave the order empty have nothing to save, so the old data stays.
    useOrderStore.getState().clear()
    expect(stored()).toBe(raw)

    useOrderStore.getState().add(muzza)
    expect(JSON.parse(stored() ?? 'null')).toEqual({ state: { lines: [muzza] }, version: 1 })
  })

  it('works in memory and reports it when the storage cannot be read', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('Blocked', 'SecurityError')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Blocked', 'SecurityError')
    })

    const { useOrderStore, useOrderStorageStatus } = await reload()
    expect(useOrderStorageStatus.getState().issue).toEqual({ kind: 'unavailable' })

    useOrderStore.getState().add(muzza)
    expect(useOrderStore.getState().lines).toMatchObject([muzza])
  })

  it('keeps the order in memory and reports once when saving fails', async () => {
    const { useOrderStore, useOrderStorageStatus } = await reload()
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Full', 'QuotaExceededError')
    })

    useOrderStore.getState().add(muzza)
    expect(useOrderStore.getState().lines).toMatchObject([muzza])
    expect(useOrderStorageStatus.getState().issue).toEqual({ kind: 'unavailable' })

    useOrderStorageStatus.getState().dismiss()
    useOrderStore.getState().add(half)
    expect(setItem).toHaveBeenCalledTimes(2)
    expect(useOrderStorageStatus.getState().issue).toBeNull()
  })

  describe('dozen to choose (P4): its flavors in the same v1 format', () => {
    const flavors = [
      { productId: 'carne', quantity: 5 },
      { productId: 'jyq', quantity: 4 },
      { productId: 'pollo', quantity: 3 },
    ]
    const dozen = { kind: 'promotion', promotionId: 'promo-docena-eleccion', quantity: 1, note: 'bien calientes', flavors } as const

    it('keeps the flavors of each dozen across a reload, apart from a different one', async () => {
      const first = await reload()
      first.useOrderStore.getState().add(dozen)
      first.useOrderStore.getState().add({ ...dozen, note: '', flavors: [{ productId: 'carne', quantity: 12 }] })
      expect(JSON.parse(stored() ?? 'null').version).toBe(1)

      const { useOrderStore, useOrderStorageStatus } = await reload()

      expect(useOrderStore.getState().lines).toMatchObject([dozen, { ...dozen, note: '', flavors: [{ productId: 'carne', quantity: 12 }] }])
      expect(useOrderStorageStatus.getState().issue).toBeNull()
    })

    it('loads a cart saved before P4 as it was: a promotion without flavors stays without them', async () => {
      seed({ state: { lines: [muzza, { kind: 'promotion', promotionId: 'promo-docena-eleccion', quantity: 1, note: '' }] }, version: 1 })

      const { useOrderStore, useOrderStorageStatus } = await reload()

      expect(useOrderStore.getState().lines).toHaveLength(2)
      expect(useOrderStore.getState().lines[1]).not.toHaveProperty('flavors')
      expect(useOrderStorageStatus.getState().issue).toBeNull()
    })

    it('keeps a dozen with unreadable flavors in the cart, marked for review, and the rest of the cart too', async () => {
      seed({ state: { lines: [muzza, { ...dozen, flavors: [{ productId: 'carne', quantity: 'doce' }] }] }, version: 1 })

      const { useOrderStore } = await reload()

      expect(useOrderStore.getState().lines).toMatchObject([muzza, { ...dozen, flavors: [] }])
    })
  })
})
