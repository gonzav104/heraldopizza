import { beforeEach, describe, expect, it } from 'vitest'
import { resetOrderStore, useOrderStore } from './order-store'

const muzza = { kind: 'product', productId: 'muzza', variantId: 'muzza:1' } as const

describe('useOrderStore', () => {
  beforeEach(() => resetOrderStore())

  it('adds, merges, and counts every add for the cart bar feedback', () => {
    const { add } = useOrderStore.getState()
    add({ ...muzza, quantity: 1, note: '' })
    add({ ...muzza, quantity: 1, note: '' })

    const { lines, addedCount } = useOrderStore.getState()
    expect(lines).toHaveLength(1)
    expect(lines[0].quantity).toBe(2)
    expect(addedCount).toBe(2)
  })

  it('increments, decrements, and removes at zero', () => {
    useOrderStore.getState().add({ ...muzza, quantity: 1, note: '' })
    const id = useOrderStore.getState().lines[0].id

    useOrderStore.getState().increment(id)
    expect(useOrderStore.getState().lines[0].quantity).toBe(2)
    useOrderStore.getState().decrement(id)
    useOrderStore.getState().decrement(id)
    expect(useOrderStore.getState().lines).toEqual([])
  })

  it('rejects a half-and-half with the same flavor twice (D3)', () => {
    useOrderStore.getState().add({ kind: 'half', firstProductId: 'a', secondProductId: 'a', quantity: 1, note: '' })
    expect(useOrderStore.getState().lines).toEqual([])
    expect(useOrderStore.getState().lastChange).toBeNull()
  })

  it('merges A+B and B+A into one half-and-half line', () => {
    const { add } = useOrderStore.getState()
    add({ kind: 'half', firstProductId: 'a', secondProductId: 'b', quantity: 1, note: '' })
    add({ kind: 'half', firstProductId: 'b', secondProductId: 'a', quantity: 1, note: '' })
    expect(useOrderStore.getState().lines).toMatchObject([{ kind: 'half', quantity: 2 }])
  })

  it('records the last change for the add and remove feedback', () => {
    useOrderStore.getState().add({ ...muzza, quantity: 1, note: '' })
    const added = useOrderStore.getState().lastChange
    expect(added).toMatchObject({ kind: 'added', line: { productId: 'muzza' } })

    const id = useOrderStore.getState().lines[0].id
    useOrderStore.getState().decrement(id)
    const removed = useOrderStore.getState().lastChange
    expect(removed).toMatchObject({ kind: 'removed', line: { productId: 'muzza' } })
    expect(removed?.seq).toBeGreaterThan(added?.seq ?? Infinity)
  })

  it('sets the note and quantity, removes, and clears', () => {
    const { add } = useOrderStore.getState()
    add({ ...muzza, quantity: 1, note: '' })
    add({ kind: 'promotion', promotionId: 'p', quantity: 1, note: '' })
    const [first, second] = useOrderStore.getState().lines

    useOrderStore.getState().setNote(first.id, 'bien cocida')
    useOrderStore.getState().setQuantity(first.id, 4)
    expect(useOrderStore.getState().lines[0]).toMatchObject({ note: 'bien cocida', quantity: 4 })

    useOrderStore.getState().remove(second.id)
    expect(useOrderStore.getState().lines).toHaveLength(1)

    useOrderStore.getState().clear()
    expect(useOrderStore.getState().lines).toEqual([])
  })
})
