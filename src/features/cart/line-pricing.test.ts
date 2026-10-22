import { describe, expect, it } from 'vitest'
import type { Product, Promotion } from '@/domain/catalog'
import { prototypeCategories, prototypeProducts } from '@/data/prototype-catalog'
import { prototypePromotions } from '@/data/prototype-promotions'
import { halfAndHalfPrice, indexCatalog, reconcileOrder, resolveLine } from './line-pricing'
import type { HalfOrderLine, OrderLine, ProductOrderLine } from './order-lines'

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

const productLine = (name: string, variantName: string, quantity = 1, note = ''): ProductOrderLine => ({
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
      messageLabel: 'Pizza mitad y mitad (Muzzarella + Napolitana Heraldo)',
      shortLabel: 'mitad y mitad de Muzzarella y Napolitana Heraldo',
    })
  })

  it('prices a promotion as one line with its own price (RF-12)', () => {
    expect(resolveLine({ id: 'p', kind: 'promotion', promotionId: 'promo-1', quantity: 1, note: '' }, index)).toMatchObject({
      title: 'Combo de prueba',
      subtotal: 20000,
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

describe('reconcileOrder', () => {
  it('counts items and the products subtotal', () => {
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
    const summary = reconcileOrder(lines, index)

    expect(summary.itemCount).toBe(11)
    // 16.000 + 2 × 13.500 + (10.500 + 13.500) + 6 × 3.000 + 9.500
    expect(summary.productsSubtotal).toBe(94500)
  })

  it('keeps lines that cannot be priced as issues, never counting them as $ 0', () => {
    const summary = reconcileOrder([productLine('Café cortado', 'Unidad'), productLine('Muzzarella', 'Entera')], index)
    expect(summary.lines).toHaveLength(1)
    expect(summary.issues).toHaveLength(1)
    expect(summary.itemCount).toBe(1)
    expect(summary.productsSubtotal).toBe(16000)
  })
})

describe('reconcileOrder: lines the current catalog cannot price (P2)', () => {
  const muzza = product('Muzzarella')
  const especial = product('Especial')
  const half = (first: Product, second: Product, quantity = 1): HalfOrderLine => ({
    id: `h-${first.id}-${second.id}`,
    kind: 'half',
    firstProductId: first.id,
    secondProductId: second.id,
    quantity,
    note: '',
  })
  /** The same catalog with some products replaced, as the store would publish it after an edit. */
  const catalogWith = (...changed: Product[]) =>
    indexCatalog(
      prototypeCategories,
      prototypeProducts.map((item) => changed.find((other) => other.id === item.id) ?? item),
      [promo],
    )
  const issueOf = (line: OrderLine, catalog = index) => reconcileOrder([line], catalog).issues[0]

  it('names a product that is out of stock and never prices it', () => {
    const catalog = catalogWith({ ...muzza, inStock: false })
    const summary = reconcileOrder([productLine('Muzzarella', 'Entera', 2), productLine('Especial', 'Entera')], catalog)

    expect(summary.lines.map((item) => item.title)).toEqual(['Especial'])
    expect(summary.issues).toEqual([
      expect.objectContaining({ kind: 'unavailable', title: 'Muzzarella', detail: 'Entera', reason: 'Sin stock por ahora.' }),
    ])
    expect(summary.productsSubtotal).toBe(variant('Especial', 'Entera').price)
    expect(summary.itemCount).toBe(1)
  })

  it('marks a variant without a published price as unavailable (RN-01, policy A)', () => {
    expect(issueOf(productLine('Café cortado', 'Unidad'))).toMatchObject({
      kind: 'unavailable',
      title: 'Café cortado',
      reason: 'Se consulta en barra: no se puede pedir por acá.',
    })
  })

  it('marks a product that is no longer in the catalog as missing, with a generic name', () => {
    expect(
      issueOf({ id: 'x', kind: 'product', productId: 'borrado', variantId: 'borrado:1', quantity: 1, note: 'sin sal' }),
    ).toMatchObject({ kind: 'missing', title: 'Un producto que ya no está en la carta', detail: null, reason: 'Ya no está en la carta.' })
  })

  it('names the product when only its variant is gone', () => {
    expect(issueOf({ ...productLine('Muzzarella', 'Entera'), variantId: 'variante-borrada' })).toMatchObject({
      kind: 'missing',
      title: 'Muzzarella',
      detail: null,
      reason: 'Esa opción ya no está en la carta.',
    })
  })

  it('marks a variant that now belongs to another product as incompatible', () => {
    expect(issueOf({ ...productLine('Muzzarella', 'Entera'), variantId: variant('Especial', 'Entera').id })).toMatchObject({
      kind: 'incompatible',
      title: 'Muzzarella',
      reason: 'Cambió en la carta: volvé a elegirlo.',
    })
  })

  it('names the flavor of a half-and-half that is out of stock', () => {
    expect(issueOf(half(muzza, especial), catalogWith({ ...especial, inStock: false }))).toMatchObject({
      kind: 'unavailable',
      title: 'Mitad y mitad',
      detail: 'Muzzarella + Especial',
      reason: 'Especial: sin stock por ahora.',
    })
  })

  it('keeps the known flavor of a half-and-half whose other flavor is gone', () => {
    expect(issueOf({ ...half(muzza, especial), secondProductId: 'borrado' })).toMatchObject({
      kind: 'missing',
      title: 'Mitad y mitad',
      detail: 'Muzzarella',
      reason: 'El otro gusto ya no está en la carta.',
    })
    expect(issueOf({ ...half(muzza, especial), firstProductId: 'a', secondProductId: 'b' })).toMatchObject({
      kind: 'missing',
      detail: null,
      reason: 'Sus gustos ya no están en la carta.',
    })
  })

  it('marks a half-and-half with a flavor that is no longer sold by halves as incompatible', () => {
    expect(issueOf(half(muzza, product('Hamburguesa simple')))).toMatchObject({
      kind: 'incompatible',
      title: 'Mitad y mitad',
      detail: 'Muzzarella + Hamburguesa simple',
      reason: 'Hamburguesa simple ya no se pide por mitades.',
    })
  })

  it('marks a half-and-half whose half lost its price as unavailable', () => {
    const noHalfPrice = { ...especial, variants: especial.variants.map((item) => (item.name === 'Media' ? { ...item, price: null } : item)) }
    expect(issueOf(half(muzza, especial), catalogWith(noHalfPrice))).toMatchObject({
      kind: 'unavailable',
      reason: 'Especial: la media no tiene precio publicado.',
    })
  })

  it('marks a promotion that is no longer in the catalog as missing', () => {
    expect(issueOf({ id: 'p', kind: 'promotion', promotionId: 'promo-vieja', quantity: 1, note: '' })).toMatchObject({
      kind: 'missing',
      title: 'Una promo que ya no está en la carta',
      reason: 'Ya no está en la carta.',
    })
  })

  it('never prices a promotion without a positive price', () => {
    const catalog = indexCatalog(prototypeCategories, prototypeProducts, [{ ...promo, price: 0 }])
    expect(issueOf({ id: 'p', kind: 'promotion', promotionId: promo.id, quantity: 1, note: '' }, catalog)).toMatchObject({
      kind: 'unavailable',
      title: promo.title,
      reason: 'No tiene precio publicado.',
    })
  })

  it('prices the line again as soon as the catalog has it back', () => {
    const line = productLine('Muzzarella', 'Entera')
    expect(reconcileOrder([line], catalogWith({ ...muzza, inStock: false })).lines).toHaveLength(0)
    expect(reconcileOrder([line], index).lines).toHaveLength(1)
  })

  it('keeps the order of the lines in both groups and reports every issue', () => {
    const lines = [
      productLine('Café cortado', 'Unidad'),
      productLine('Muzzarella', 'Entera'),
      { id: 'p', kind: 'promotion', promotionId: 'promo-vieja', quantity: 1, note: '' } as OrderLine,
      productLine('Especial', 'Entera'),
    ]
    const summary = reconcileOrder(lines, index)

    expect(summary.issues.map((item) => item.line)).toEqual([lines[0], lines[2]])
    expect(summary.lines.map((item) => item.line)).toEqual([lines[1], lines[3]])
  })
})

describe('reconcileOrder: the dozen to choose (P4)', () => {
  const dozen = prototypePromotions.find((item) => item.title === 'Docena de empanadas a elección')
  const assorted = prototypePromotions.find((item) => item.title === 'Docena de empanadas surtidas')
  if (!dozen || !assorted) throw new Error('prototype promotions')
  const carne = product('Empanada de carne picada')
  const jyq = product('Empanada de jamón y queso')
  const pollo = product('Empanada de pollo')
  const catalogWith = (...changed: Product[]) =>
    indexCatalog(
      prototypeCategories,
      prototypeProducts.map((item) => changed.find((other) => other.id === item.id) ?? item),
      prototypePromotions,
    )
  const promos = catalogWith()
  const picks = (...entries: [Product | string, number][]) =>
    entries.map(([item, quantity]) => ({ productId: typeof item === 'string' ? item : item.id, quantity }))
  const dozenLine = (flavors: { productId: string; quantity: number }[] | undefined, quantity = 1): OrderLine => ({
    id: 'd',
    kind: 'promotion',
    promotionId: dozen.id,
    quantity,
    note: '',
    ...(flavors ? { flavors } : {}),
  })
  const issueOf = (line: OrderLine, catalog = promos) => reconcileOrder([line], catalog).issues[0]

  it('prices a full dozen at the promotion price, whatever the flavors, and lists them in menu order', () => {
    const summary = reconcileOrder([dozenLine(picks([pollo, 3], [carne, 5], [jyq, 4]), 2)], promos)

    expect(summary.issues).toEqual([])
    expect(summary.lines[0]).toMatchObject({
      title: 'Docena de empanadas a elección',
      detail: 'Promo',
      parts: ['5 Carne picada', '3 Pollo', '4 Jamón y queso'],
      unitPrice: dozen.price,
      subtotal: dozen.price * 2,
    })
    expect(summary.itemCount).toBe(2)
  })

  it('keeps the assorted dozen as a closed combo, with no flavors', () => {
    const line: OrderLine = { id: 's', kind: 'promotion', promotionId: assorted.id, quantity: 1, note: '' }
    expect(reconcileOrder([line], promos).lines[0]).toMatchObject({ title: 'Docena de empanadas surtidas', parts: [], subtotal: assorted.price })
  })

  it('asks to rebuild a dozen saved without flavors, never pricing or inventing them', () => {
    expect(issueOf(dozenLine(undefined))).toMatchObject({
      kind: 'incompatible',
      title: 'Docena de empanadas a elección',
      reason: 'No tiene los gustos elegidos: quitala y armala de nuevo.',
    })
  })

  it.each([
    ['unreadable saved flavors', []],
    ['a total other than 12', picks([carne, 5], [pollo, 3])],
  ])('marks %s as incompatible', (_, flavors) => {
    expect(issueOf(dozenLine(flavors))).toMatchObject({ kind: 'incompatible', reason: 'Los gustos guardados no son válidos: quitala y armala de nuevo.' })
  })

  it('marks a flavor that is no longer in the catalog as missing, naming the ones that are', () => {
    expect(issueOf(dozenLine(picks([carne, 6], ['empanada-borrada', 6])))).toMatchObject({
      kind: 'missing',
      detail: '6 Carne picada',
      reason: 'Un gusto elegido ya no está en la carta: quitala y armala de nuevo.',
    })
  })

  it('marks a product that is no longer a flavor of the dozen as incompatible', () => {
    const moved = { ...pollo, categoryId: product('Muzzarella').categoryId }
    expect(issueOf(dozenLine(picks([carne, 9], [pollo, 3])), catalogWith(moved))).toMatchObject({
      kind: 'incompatible',
      reason: 'Empanada de pollo ya no se puede elegir en esta docena.',
    })
    expect(issueOf(dozenLine(picks([carne, 9], [product('Muzzarella'), 3])))).toMatchObject({ kind: 'incompatible' })
  })

  it('marks a flavor out of stock or without a unit price as unavailable, and prices it again when it is back', () => {
    const line = dozenLine(picks([carne, 9], [pollo, 3]))
    expect(issueOf(line, catalogWith({ ...pollo, inStock: false }))).toMatchObject({ kind: 'unavailable', reason: 'Pollo: sin stock por ahora.' })
    const unpriced = { ...pollo, variants: pollo.variants.map((variant) => ({ ...variant, price: null })) }
    expect(issueOf(line, catalogWith(unpriced))).toMatchObject({ kind: 'unavailable', reason: 'Pollo: no se puede pedir por ahora.' })
    expect(reconcileOrder([line], promos).lines).toHaveLength(1)
  })

  it('marks flavors on a promotion that has no flavor choice as incompatible', () => {
    const line: OrderLine = { id: 's', kind: 'promotion', promotionId: assorted.id, quantity: 1, note: '', flavors: picks([carne, 12]) }
    expect(issueOf(line)).toMatchObject({ kind: 'incompatible', reason: 'Esta promo no se arma con gustos: quitala y volvé a agregarla.' })
  })
})
