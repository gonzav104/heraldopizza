import { describe, expect, it } from 'vitest'
import seed from '../../../supabase/seed_promociones.sql?raw'
import { mapPromotionRows } from '@/data/catalog-mapper'
import { prototypeCategories, prototypeProducts } from '@/data/prototype-catalog'
import { indexCatalog, isReadyForCheckout, reconcileOrder } from './line-pricing'
import { addLine, type OrderLine } from './order-lines'
import { readStoredOrder } from './order-storage'

// P5a: carts saved on the device (format v1, unchanged) against promotions read from Supabase. The rows below have
// the shape the API returns and come from the real seed, so a code that drifted from what carts hold fails here.

const unquote = (value: string) => (value === 'null' ? null : value.slice(1, -1).replace(/''/g, "'"))
const ROW = /\('[0-9a-f-]{36}', '(promo-[a-z0-9-]+)', ('(?:[^']|'')*'), (null|'(?:[^']|'')*'), (\d+), (\d+), (null|'[0-9a-f-]{36}'), (null|\d+)\)/g
const seedRows = [...seed.matchAll(ROW)].map(([, codigo, titulo, descripcion, precio, orden, categoria, unidades]) => ({
  codigo,
  titulo: unquote(titulo),
  descripcion: unquote(descripcion),
  precio: Number(precio),
  orden: Number(orden),
  vigente_desde: null,
  vigente_hasta: null,
  dias_semana: null,
  eleccion_categoria_id: unquote(categoria),
  eleccion_unidades: unidades === 'null' ? null : Number(unidades),
}))

/** What the public menu reads: the seed rows the API returns now (after row level security), maybe edited. */
const catalogWith = (rows = seedRows) => indexCatalog(prototypeCategories, prototypeProducts, mapPromotionRows(rows))
const without = (...codes: string[]) => seedRows.filter((row) => !codes.includes(row.codigo))

const id = (name: string) => {
  const found = prototypeProducts.find((product) => product.name === name)
  if (!found) throw new Error(name)
  return found
}
const muzza = id('Muzzarella')
const dozenFlavors = [
  { productId: id('Empanada de carne picada').id, quantity: 5 },
  { productId: id('Empanada de jamón y queso').id, quantity: 4 },
  { productId: id('Empanada de pollo').id, quantity: 3 },
]

/** A cart as P1 saves it in localStorage, read back exactly as the store does on a reload. */
function reload(lines: unknown[]) {
  const { lines: restored, issue } = readStoredOrder(JSON.stringify({ state: { lines }, version: 1 }))
  let next = 0
  const order = restored.reduce<OrderLine[]>((all, line) => addLine(all, line, () => `l${++next}`), [])
  return { order, issue }
}

const dozenLine = { kind: 'promotion', promotionId: 'promo-docena-eleccion', quantity: 1, note: '', flavors: dozenFlavors }
const tresLine = { kind: 'promotion', promotionId: 'promo-tres-muzzarella', quantity: 1, note: '' }
const muzzaLine = { kind: 'product', productId: muzza.id, variantId: muzza.variants.find((v) => v.name === 'Entera')?.id, quantity: 1, note: '' }
const UNAVAILABLE = 'Esta promoción ya no está disponible.'

describe('saved carts against the promotions in Supabase (P5a)', () => {
  it('1–2. a cart saved before P5a with promo-docena-eleccion and its 12 flavors prices the same, at the database price', () => {
    const { order, issue } = reload([dozenLine])
    const summary = reconcileOrder(order, catalogWith())

    expect(issue).toBeNull()
    expect(summary.issues).toEqual([])
    expect(summary.lines[0]).toMatchObject({ title: 'Docena de empanadas a elección', subtotal: 36000, parts: ['5 Carne picada', '3 Pollo', '4 Jamón y queso'] })
    expect(isReadyForCheckout(summary)).toBe(true)
  })

  it('1b. a dozen saved before P4, without flavors, stays in the cart for review: no flavors are invented', () => {
    const { order } = reload([{ ...dozenLine, flavors: undefined }])
    const summary = reconcileOrder(order, catalogWith())

    expect(summary.issues).toEqual([expect.objectContaining({ kind: 'incompatible', reason: 'No tiene los gustos elegidos: quitala y armala de nuevo.' })])
    expect(isReadyForCheckout(summary)).toBe(false)
  })

  it.each([
    ['3. switched off', without('promo-tres-muzzarella')],
    ['4. out of its dates or days (row level security leaves it out the same way)', without('promo-tres-muzzarella')],
  ])('%s: the line stays, says it is no longer available, and blocks the checkout', (_, rows) => {
    const { order } = reload([tresLine])
    const summary = reconcileOrder(order, catalogWith(rows))

    expect(order).toHaveLength(1)
    expect(summary.issues).toEqual([expect.objectContaining({ kind: 'missing', title: 'Una promoción', reason: UNAVAILABLE })])
    expect(summary.productsSubtotal).toBe(0)
    expect(isReadyForCheckout(summary)).toBe(false)
  })

  it('5. a code that never existed is kept and flagged the same way, never replaced by another promotion', () => {
    const { order } = reload([{ ...tresLine, promotionId: 'promo-borrada' }])
    const summary = reconcileOrder(order, catalogWith())

    expect(summary.issues).toEqual([expect.objectContaining({ reason: UNAVAILABLE, line: expect.objectContaining({ promotionId: 'promo-borrada' }) })])
    expect(summary.lines).toEqual([])
  })

  it('6. a new price applies at once: carts keep no prices', () => {
    const { order } = reload([tresLine])
    const rows = seedRows.map((row) => (row.codigo === 'promo-tres-muzzarella' ? { ...row, precio: 45000 } : row))

    expect(reconcileOrder(order, catalogWith(rows)).lines[0]).toMatchObject({ unitPrice: 45000, subtotal: 45000 })
  })

  it('7. a mixed cart prices what is available, keeps what is not, and blocks the checkout until it is removed', () => {
    const { order } = reload([muzzaLine, dozenLine, tresLine, { kind: 'promotion', promotionId: 'promo-docena-surtida', quantity: 2, note: '' }])
    const summary = reconcileOrder(order, catalogWith(without('promo-tres-muzzarella')))

    expect(order).toHaveLength(4)
    expect(summary.lines.map((item) => item.title)).toEqual(['Muzzarella', 'Docena de empanadas a elección', 'Docena de empanadas surtidas'])
    expect(summary.issues.map((item) => item.reason)).toEqual([UNAVAILABLE])
    expect(summary.productsSubtotal).toBe(muzza.variants.find((v) => v.name === 'Entera')!.price! + 36000 + 2 * 30000)
    expect(isReadyForCheckout(summary)).toBe(false)
  })

  it('8. malformed saved data: an unreadable line is dropped with a notice, unreadable flavors keep the dozen for review', () => {
    const { order, issue } = reload([muzzaLine, { kind: 'promotion', promotionId: '' }, { ...dozenLine, flavors: [{ productId: 'x', quantity: 'doce' }] }])
    const summary = reconcileOrder(order, catalogWith())

    expect(issue).toEqual({ kind: 'partial', discarded: 1 })
    expect(order).toHaveLength(2)
    expect(summary.issues).toEqual([expect.objectContaining({ kind: 'incompatible', reason: 'Los gustos guardados no son válidos: quitala y armala de nuevo.' })])
    expect(isReadyForCheckout(summary)).toBe(false)
  })
})
