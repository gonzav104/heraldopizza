import { describe, expect, it } from 'vitest'
import {
  addLine,
  changeQuantity,
  normalizeNote,
  quantityOf,
  removeLine,
  restoreLines,
  setLineNote,
  setLineQuantity,
  type OrderLine,
} from './order-lines'

function idFactory() {
  let next = 0
  return () => `l${++next}`
}

const muzzaWhole = { kind: 'product', productId: 'muzza', variantId: 'muzza:1' } as const

describe('addLine', () => {
  it('adds a new line with the given quantity and note', () => {
    const lines = addLine([], { ...muzzaWhole, quantity: 2, note: 'sin aceitunas' }, idFactory())
    expect(lines).toEqual([{ id: 'l1', ...muzzaWhole, quantity: 2, note: 'sin aceitunas' }])
  })

  it('merges quantities when product, variant, and note match', () => {
    const createId = idFactory()
    let lines = addLine([], { ...muzzaWhole, quantity: 1, note: '' }, createId)
    lines = addLine(lines, { ...muzzaWhole, quantity: 2, note: '' }, createId)
    expect(lines).toHaveLength(1)
    expect(lines[0].quantity).toBe(3)
  })

  it('compares notes after trimming, so stray spaces do not split a line', () => {
    const createId = idFactory()
    let lines = addLine([], { ...muzzaWhole, quantity: 1, note: 'sin aceitunas' }, createId)
    lines = addLine(lines, { ...muzzaWhole, quantity: 1, note: '  sin aceitunas ' }, createId)
    expect(lines).toHaveLength(1)
    expect(lines[0].quantity).toBe(2)
  })

  it('keeps a separate line when the note differs', () => {
    const createId = idFactory()
    let lines = addLine([], { ...muzzaWhole, quantity: 1, note: '' }, createId)
    lines = addLine(lines, { ...muzzaWhole, quantity: 1, note: 'bien cocida' }, createId)
    expect(lines).toHaveLength(2)
  })

  it('keeps a separate line for another variant of the same product', () => {
    const createId = idFactory()
    let lines = addLine([], { ...muzzaWhole, quantity: 1, note: '' }, createId)
    lines = addLine(lines, { kind: 'product', productId: 'muzza', variantId: 'muzza:2', quantity: 1, note: '' }, createId)
    expect(lines).toHaveLength(2)
  })

  it('merges the same half-and-half pair in either order', () => {
    const createId = idFactory()
    let lines = addLine([], { kind: 'half', firstProductId: 'a', secondProductId: 'b', quantity: 1, note: '' }, createId)
    lines = addLine(lines, { kind: 'half', firstProductId: 'b', secondProductId: 'a', quantity: 1, note: '' }, createId)
    expect(lines).toHaveLength(1)
    expect(lines[0].quantity).toBe(2)
  })

  it('merges promotions by id and note', () => {
    const createId = idFactory()
    let lines = addLine([], { kind: 'promotion', promotionId: 'p', quantity: 1, note: '' }, createId)
    lines = addLine(lines, { kind: 'promotion', promotionId: 'p', quantity: 1, note: '' }, createId)
    expect(lines).toHaveLength(1)
    expect(lines[0].quantity).toBe(2)
  })

  it('rejects a half-and-half with the same flavor twice (D3)', () => {
    expect(addLine([], { kind: 'half', firstProductId: 'a', secondProductId: 'a', quantity: 1, note: '' }, idFactory())).toEqual([])
  })

  it('ignores non-positive quantities', () => {
    expect(addLine([], { ...muzzaWhole, quantity: 0, note: '' }, idFactory())).toEqual([])
  })
})

describe('quantity changes', () => {
  const base: OrderLine[] = [{ id: 'l1', ...muzzaWhole, quantity: 1, note: '' }]

  it('increments and decrements a line', () => {
    expect(changeQuantity(base, 'l1', 1)[0].quantity).toBe(2)
  })

  it('removes the line when it reaches zero', () => {
    expect(changeQuantity(base, 'l1', -1)).toEqual([])
  })

  it('sets an exact quantity and removes at zero', () => {
    expect(setLineQuantity(base, 'l1', 5)[0].quantity).toBe(5)
    expect(setLineQuantity(base, 'l1', 0)).toEqual([])
  })

  it('removes a line', () => {
    expect(removeLine(base, 'l1')).toEqual([])
  })

  it('does not touch other lines', () => {
    const lines: OrderLine[] = [...base, { id: 'l2', kind: 'promotion', promotionId: 'p', quantity: 1, note: '' }]
    expect(changeQuantity(lines, 'l2', 1)[0]).toBe(lines[0])
  })
})

describe('notes', () => {
  it('trims and caps notes at 120 characters (RF-14)', () => {
    expect(normalizeNote('  sin aceitunas  ')).toBe('sin aceitunas')
    expect(normalizeNote('x'.repeat(200))).toHaveLength(120)
  })

  it('sets a normalized note on a line', () => {
    const lines: OrderLine[] = [{ id: 'l1', ...muzzaWhole, quantity: 1, note: '' }]
    expect(setLineNote(lines, 'l1', ' bien cocida ')[0].note).toBe('bien cocida')
  })
})

describe('quantityOf', () => {
  it('sums a variant across lines with different notes', () => {
    const lines: OrderLine[] = [
      { id: 'l1', ...muzzaWhole, quantity: 2, note: '' },
      { id: 'l2', ...muzzaWhole, quantity: 1, note: 'bien cocida' },
      { id: 'l3', kind: 'product', productId: 'muzza', variantId: 'muzza:2', quantity: 4, note: '' },
    ]
    expect(quantityOf(lines, 'muzza', 'muzza:1')).toBe(3)
    expect(quantityOf(lines, 'muzza', 'muzza:2')).toBe(4)
    expect(quantityOf(lines, 'otra', 'otra:1')).toBe(0)
  })
})

describe('dozen to choose: picked flavors (P4)', () => {
  const dozen = (flavors: { productId: string; quantity: number }[], note = '') =>
    ({ kind: 'promotion', promotionId: 'docena', quantity: 1, note, flavors }) as const

  it('keeps the flavors sorted, so the same picks in another order are the same dozen and merge', () => {
    const first = addLine([], dozen([{ productId: 'pollo', quantity: 3 }, { productId: 'carne', quantity: 9 }]), idFactory())
    expect(first[0]).toMatchObject({ flavors: [{ productId: 'carne', quantity: 9 }, { productId: 'pollo', quantity: 3 }] })

    const merged = addLine(first, dozen([{ productId: 'carne', quantity: 9 }, { productId: 'pollo', quantity: 3 }]), idFactory())
    expect(merged).toHaveLength(1)
    expect(merged[0].quantity).toBe(2)
  })

  it('keeps different picks, or the same picks with another note, as separate dozens', () => {
    const ids = idFactory()
    let lines = addLine([], dozen([{ productId: 'carne', quantity: 12 }]), ids)
    lines = addLine(lines, dozen([{ productId: 'carne', quantity: 6 }, { productId: 'pollo', quantity: 6 }]), ids)
    lines = addLine(lines, dozen([{ productId: 'carne', quantity: 12 }], 'bien calientes'), ids)
    expect(lines).toHaveLength(3)
  })

  it('never merges a dozen with picks into the same promotion without them', () => {
    const ids = idFactory()
    let lines = addLine([], { kind: 'promotion', promotionId: 'docena', quantity: 1, note: '' }, ids)
    lines = addLine(lines, dozen([{ productId: 'carne', quantity: 12 }]), ids)
    expect(lines).toHaveLength(2)
  })
})

describe('restoreLines: saved flavors (P4)', () => {
  const saved = (flavors: unknown) => ({ kind: 'promotion', promotionId: 'docena', quantity: 1, note: '', flavors })

  it('restores well-formed flavors, sorted', () => {
    expect(restoreLines([saved([{ productId: 'pollo', quantity: 3 }, { productId: 'carne', quantity: 9 }])])).toEqual({
      lines: [{ kind: 'promotion', promotionId: 'docena', quantity: 1, note: '', flavors: [{ productId: 'carne', quantity: 9 }, { productId: 'pollo', quantity: 3 }] }],
      discarded: 0,
    })
  })

  it('keeps a promotion saved before P4, without flavors, exactly as it was', () => {
    expect(restoreLines([{ kind: 'promotion', promotionId: 'docena', quantity: 2, note: '' }])?.lines).toEqual([
      { kind: 'promotion', promotionId: 'docena', quantity: 2, note: '' },
    ])
  })

  it.each([
    ['not a list', 'carne'],
    ['an entry that is not an object', ['carne']],
    ['an empty id', [{ productId: '', quantity: 12 }]],
    ['a fractional quantity', [{ productId: 'carne', quantity: 11.5 }, { productId: 'pollo', quantity: 0.5 }]],
    ['a zero quantity', [{ productId: 'carne', quantity: 12 }, { productId: 'pollo', quantity: 0 }]],
    ['a repeated flavor', [{ productId: 'carne', quantity: 6 }, { productId: 'carne', quantity: 6 }]],
  ])('keeps the dozen, marked as unusable, when its saved flavors have %s', (_, flavors) => {
    expect(restoreLines([saved(flavors)])).toEqual({
      lines: [{ kind: 'promotion', promotionId: 'docena', quantity: 1, note: '', flavors: [] }],
      discarded: 0,
    })
  })

  it('keeps well-formed flavors that do not add up to 12: the catalog check flags them', () => {
    expect(restoreLines([saved([{ productId: 'carne', quantity: 5 }])])?.lines[0]).toMatchObject({ flavors: [{ productId: 'carne', quantity: 5 }] })
  })
})
