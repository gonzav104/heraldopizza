import { describe, expect, it } from 'vitest'
import { prototypeCategories, prototypeProducts } from '@/data/prototype-catalog'
import type { Product, Promotion } from '@/domain/catalog'
import { indexCatalog, reconcileOrder } from '@/features/cart/line-pricing'
import type { OrderLine } from '@/features/cart/order-lines'
import { emptyCheckout, type CheckoutDetails } from './prototype-order'
import {
  VERIFICATION_TTL_MS,
  cartKey,
  checkoutKey,
  compareOrders,
  isVerificationCurrent,
  snapshotOf,
} from './order-verification'

const byName = (name: string) => prototypeProducts.find((product) => product.name === name)!
const muzza = byName('Muzzarella')
const entera = muzza.variants.find((variant) => variant.name === 'Entera')!
const carne = byName('Empanada de carne picada')
const jyq = byName('Empanada de jamón y queso')
const dozen: Promotion = {
  id: 'promo-docena-eleccion',
  title: 'Docena de empanadas a elección',
  description: null,
  price: 36000,
  imageUrl: null,
  activeFrom: null,
  activeTo: null,
  weekdays: [],
  flavorChoice: { categoryId: carne.categoryId, units: 12 },
} as unknown as Promotion

const lines: OrderLine[] = [
  { id: 'l1', kind: 'product', productId: muzza.id, variantId: entera.id, quantity: 2, note: 'bien cocida' },
  {
    id: 'l2',
    kind: 'promotion',
    promotionId: dozen.id,
    quantity: 1,
    note: '',
    flavors: [
      { productId: carne.id, quantity: 6 },
      { productId: jyq.id, quantity: 6 },
    ],
  },
]
const pickup: CheckoutDetails = { ...emptyCheckout, name: 'Ana Gómez', mode: 'retiro', payment: 'efectivo' }

function snapshot(products: Product[] = prototypeProducts, details = pickup, order = lines, promotions = [dozen]) {
  const summary = reconcileOrder(order, indexCatalog(prototypeCategories, products, promotions))
  return snapshotOf(order, summary, details)
}
const repriced = (name: string, variant: string, price: number) =>
  prototypeProducts.map((product) =>
    product.name === name
      ? { ...product, variants: product.variants.map((item) => (item.name === variant ? { ...item, price } : item)) }
      : product,
  )

describe('cartKey and checkoutKey (P6a-2)', () => {
  it('change with every product, quantity, variant, flavor, and note, and never with the generated line ids', () => {
    const base = cartKey(lines)
    expect(cartKey(lines.map((line) => ({ ...line, id: `x-${line.id}` })))).toBe(base)
    expect(cartKey([{ ...lines[0], quantity: 3 }, lines[1]])).not.toBe(base)
    expect(cartKey([{ ...lines[0], note: 'a punto' }, lines[1]])).not.toBe(base)
    const media = muzza.variants.find((variant) => variant.name === 'Media')!
    expect(cartKey([{ ...(lines[0] as Extract<OrderLine, { kind: 'product' }>), variantId: media.id }, lines[1]])).not.toBe(base)
    const flavors = [
      { productId: carne.id, quantity: 7 },
      { productId: jyq.id, quantity: 5 },
    ]
    expect(cartKey([lines[0], { ...(lines[1] as Extract<OrderLine, { kind: 'promotion' }>), flavors }])).not.toBe(base)
    expect(cartKey([lines[0]])).not.toBe(base)
  })

  it('checkoutKey follows what the message says: name, mode, address for delivery, payment, and note', () => {
    const base = checkoutKey(pickup)
    expect(checkoutKey({ ...pickup, name: '  Ana Gómez ' })).toBe(base)
    expect(checkoutKey({ ...pickup, address: 'Rivadavia 100' })).toBe(base)
    expect(checkoutKey({ ...pickup, payment: 'credito' })).not.toBe(base)
    expect(checkoutKey({ ...pickup, note: 'sin cebolla' })).not.toBe(base)
    expect(checkoutKey({ ...pickup, mode: 'envio', payment: 'efectivo', address: 'Rivadavia 100' })).not.toBe(
      checkoutKey({ ...pickup, mode: 'envio', payment: 'efectivo', address: 'Rivadavia 200' }),
    )
  })
})

describe('snapshotOf (P6a-2)', () => {
  it('records each line with its own identity, quantity, unit price, and subtotal, and the totals', () => {
    const seen = snapshot()!
    expect(seen.lines).toEqual([
      expect.objectContaining({ title: 'Muzzarella', quantity: 2, unitPrice: entera.price, subtotal: 2 * entera.price! }),
      expect.objectContaining({ title: 'Docena de empanadas a elección', quantity: 1, unitPrice: 36000, subtotal: 36000 }),
    ])
    expect(seen.products).toBe(2 * entera.price! + 36000)
    expect(seen.creditSurcharge).toBeNull()
    expect(seen.total).toBe(seen.products)
  })

  it('includes the 8 % credit surcharge on pickup', () => {
    const seen = snapshot(prototypeProducts, { ...pickup, payment: 'credito' })!
    expect(seen.creditSurcharge).toBe(Math.round((seen.products * 8) / 100))
    expect(seen.total).toBe(seen.products + seen.creditSurcharge!)
  })

  it('is null when the order cannot be checked out (P2 decides)', () => {
    const outOfStock = prototypeProducts.map((product) => (product.id === muzza.id ? { ...product, inStock: false } : product))
    expect(snapshot(outOfStock)).toBeNull()
    expect(snapshot(prototypeProducts, pickup, lines, [])).toBeNull()
  })
})

describe('compareOrders (P6a-2)', () => {
  it('finds nothing when the fresh catalog prices the same order the same', () => {
    expect(compareOrders(snapshot()!, snapshot()!)).toEqual({
      sameCart: true,
      sameCheckout: true,
      priceChanges: [],
      totalBefore: snapshot()!.total,
      totalAfter: snapshot()!.total,
    })
  })

  it('lists each line whose price changed, before and after, and the new total', () => {
    const seen = snapshot()!
    const fresh = snapshot(repriced('Muzzarella', 'Entera', entera.price! + 1000))!
    const comparison = compareOrders(seen, fresh)
    expect(comparison.priceChanges).toEqual([
      {
        key: seen.lines[0].key,
        title: 'Muzzarella',
        detail: 'Entera',
        quantity: 2,
        before: { unitPrice: entera.price, subtotal: 2 * entera.price! },
        after: { unitPrice: entera.price! + 1000, subtotal: 2 * (entera.price! + 1000) },
      },
    ])
    expect(comparison.totalAfter - comparison.totalBefore).toBe(2000)
  })

  it('tells a different cart or different checkout data apart, never only by the total', () => {
    const seen = snapshot()!
    // Same total, different cart: two Muzzarella notes swapped for a different note.
    const other = snapshot(prototypeProducts, pickup, [{ ...lines[0], note: 'sin sal' }, lines[1]])!
    expect(other.total).toBe(seen.total)
    expect(compareOrders(seen, other).sameCart).toBe(false)
    expect(compareOrders(seen, snapshot(prototypeProducts, { ...pickup, note: 'timbre 2' })!).sameCheckout).toBe(false)
  })

  it('reports a surcharge change through the total when the payment moves to credit', () => {
    const seen = snapshot()!
    const credit = snapshot(prototypeProducts, { ...pickup, payment: 'credito' })!
    const comparison = compareOrders(seen, credit)
    expect(comparison.priceChanges).toEqual([])
    expect(comparison.totalAfter).toBeGreaterThan(comparison.totalBefore)
    expect(comparison.sameCheckout).toBe(false)
  })
})

describe('isVerificationCurrent (P6a-2)', () => {
  const at = new Date('2026-10-24T20:00:00Z') // 17:00 in Argentina

  it('lasts at most 10 minutes', () => {
    expect(VERIFICATION_TTL_MS).toBe(10 * 60 * 1000)
    expect(isVerificationCurrent(at, new Date(at.getTime() + VERIFICATION_TTL_MS - 1))).toBe(true)
    expect(isVerificationCurrent(at, new Date(at.getTime() + VERIFICATION_TTL_MS))).toBe(false)
  })

  it('ends when the day changes in Argentina, even within the 10 minutes', () => {
    const lateNight = new Date('2026-10-25T02:55:00Z') // 23:55 in Argentina
    expect(isVerificationCurrent(lateNight, new Date('2026-10-25T02:59:59Z'))).toBe(true)
    expect(isVerificationCurrent(lateNight, new Date('2026-10-25T03:00:00Z'))).toBe(false)
  })

  it('treats a clock that went backwards as not current', () => {
    expect(isVerificationCurrent(at, new Date(at.getTime() - 1000))).toBe(false)
  })
})
