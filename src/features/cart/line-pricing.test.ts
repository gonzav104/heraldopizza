import { describe, expect, it } from 'vitest'
import type { Product, Promotion } from '@/domain/catalog'
import { prototypeCategories, prototypeProducts } from '@/data/prototype-catalog'
import { halfAndHalfPrice, indexCatalog, resolveLine, summarizeOrder } from './line-pricing'
import type { OrderLine } from './order-lines'

const product = (name: string): Product => {
  const found = prototypeProducts.find((item) => item.name === name)
  if (!found) throw new Error(name)
  return found
}
const variant = (name: string, variantName: string) => {
  const found = product(name).variants.find((item) => item.name === variantName)
  if (!found) throw new Error(`${name} ${variantName}`)
  return found
}

const promo: Promotion = {
  id: 'promo-1',
  title: 'Combo de prueba',
  description: null,
  price: 20000,
  imageUrl: null,
  activeFrom: '',
  activeTo: '',
  weekdays: [],
}

const index = indexCatalog(prototypeCategories, prototypeProducts, [promo])

const productLine = (name: string, variantName: string, quantity = 1, note = ''): OrderLine => ({
  id: `${name}-${variantName}-${note}`,
  kind: 'product',
  productId: product(name).id,
  variantId: variant(name, variantName).id,
  quantity,
  note,
})

describe('resolveLine', () => {
  it('prices a product line from the catalog (RF-16)', () => {
    const resolved = resolveLine(productLine('Muzzarella', 'Entera', 2), index)
    expect(resolved).toMatchObject({
      title: 'Muzzarella',
      detail: 'Entera',
      unitPrice: 16000,
      subtotal: 32000,
      messageLabel: 'Muzzarella (Entera)',
      shortLabel: 'Muzzarella entera',
    })
  })

  it('labels a half pizza as "Media pizza" (D2)', () => {
    expect(resolveLine(productLine('Muzzarella', 'Media'), index)).toMatchObject({
      title: 'Muzzarella',
      detail: 'Media pizza',
      subtotal: 10500,
      pizzaUnits: 1,
      messageLabel: 'Media pizza de Muzzarella',
      shortLabel: 'media pizza de Muzzarella',
    })
  })

  it('hides the meaningless "Unidad" variant name', () => {
    expect(resolveLine(productLine('Empanada de carne picada', 'Unidad', 2), index)).toMatchObject({
      title: 'Empanada de carne picada',
      detail: null,
      subtotal: 6000,
    })
  })

  it('never prices a variant without a published price (RN-01)', () => {
    expect(resolveLine(productLine('Café cortado', 'Unidad'), index)).toBeNull()
  })

  it('returns null for products that are not in the catalog', () => {
    expect(resolveLine({ id: 'x', kind: 'product', productId: 'nope', variantId: 'nope:1', quantity: 1, note: '' }, index)).toBeNull()
  })

  it('does not price a half-and-half with the same flavor twice (D3)', () => {
    const id = product('Muzzarella').id
    expect(resolveLine({ id: 'h', kind: 'half', firstProductId: id, secondProductId: id, quantity: 1, note: '' }, index)).toBeNull()
  })

  it('prices half-and-half as the sum of both halves (RF-56, RN-10)', () => {
    const line: OrderLine = {
      id: 'h',
      kind: 'half',
      firstProductId: product('Muzzarella').id,
      secondProductId: product('Napolitana Heraldo').id,
      quantity: 2,
      note: '',
    }
    expect(resolveLine(line, index)).toMatchObject({
      title: 'Mitad y mitad',
      detail: 'Muzzarella + Napolitana Heraldo',
      unitPrice: 25000,
      subtotal: 50000,
      pizzaUnits: 2,
      messageLabel: 'Pizza mitad y mitad (Muzzarella + Napolitana Heraldo)',
      shortLabel: 'mitad y mitad de Muzzarella y Napolitana Heraldo',
    })
  })

  it('prices a promotion as one line with its own price (RF-12)', () => {
    expect(resolveLine({ id: 'p', kind: 'promotion', promotionId: 'promo-1', quantity: 1, note: '' }, index)).toMatchObject({
      title: 'Combo de prueba',
      subtotal: 20000,
      pizzaUnits: 0,
    })
  })

  it('carries the made-to-order notice (RF-06)', () => {
    expect(resolveLine(productLine('Ensaimada', 'Grande'), index)?.madeToOrder).toEqual([
      { name: 'Ensaimada', notice: 'Pedir con 1 o 2 días de anticipación.' },
    ])
  })
})

describe('halfAndHalfPrice', () => {
  it('adds both half prices', () => {
    expect(halfAndHalfPrice(product('Muzzarella'), product('Napolitana Heraldo'))).toEqual({ first: 10500, second: 14500, total: 25000 })
  })

  it('returns null when a product has no half price', () => {
    expect(halfAndHalfPrice(product('Muzzarella'), product('Hamburguesa simple'))).toBeNull()
  })
})

describe('summarizeOrder', () => {
  it('counts items, the products subtotal, and pizzas for the delivery surcharge (RF-62)', () => {
    const lines: OrderLine[] = [
      productLine('Muzzarella', 'Entera', 1),
      productLine('Especial', 'Media', 2),
      {
        id: 'h',
        kind: 'half',
        firstProductId: product('Muzzarella').id,
        secondProductId: product('Especial').id,
        quantity: 1,
        note: '',
      },
      productLine('Empanada de carne picada', 'Unidad', 6),
      productLine('Coca-Cola 1,75 L', 'Unidad', 1),
    ]
    const summary = summarizeOrder(lines, index)

    expect(summary.itemCount).toBe(11)
    // 16.000 + 2 × 13.500 + (10.500 + 13.500) + 6 × 3.000 + 9.500
    expect(summary.productsSubtotal).toBe(94500)
    // One whole, two halves, one half-and-half: each counts once.
    expect(summary.pizzaCount).toBe(4)
  })

  it('skips lines that cannot be priced instead of counting them as $ 0', () => {
    const summary = summarizeOrder([productLine('Café cortado', 'Unidad'), productLine('Muzzarella', 'Entera')], index)
    expect(summary.lines).toHaveLength(1)
    expect(summary.itemCount).toBe(1)
    expect(summary.productsSubtotal).toBe(16000)
  })
})
