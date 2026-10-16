import { describe, expect, it } from 'vitest'
import { prototypeCategories, prototypeProducts } from '@/data/prototype-catalog'
import {
  boardLabel,
  buildMenuSections,
  halfAndHalfCandidates,
  halfPrice,
  madeToOrderDetail,
  orderableVariants,
  sheetVariants,
  visibleVariantName,
} from './presentation'

const sections = buildMenuSections(prototypeCategories, prototypeProducts)
const byName = (name: string) => sections.find((section) => section.category.name === name)
const product = (name: string) => {
  const found = prototypeProducts.find((item) => item.name === name)
  if (!found) throw new Error(name)
  return found
}

describe('buildMenuSections', () => {
  it('keeps the 13 SQL categories in their defined order, with Postres eighth (D6)', () => {
    expect(sections.map((section) => section.category.order)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13])
    expect(sections[7].category.name).toBe('Postres')
  })

  it('lays out pizzas with whole/half pills (RF-60)', () => {
    expect(byName('Pizzas')?.layout).toBe('pizza')
    expect(byName('Pizzas')?.items).toHaveLength(19)
  })

  it('groups same-price empanadas in a flavor board and keeps the assorted dozen apart (RF-61)', () => {
    const empanadas = byName('Empanadas')
    expect(empanadas?.boardItems).toHaveLength(10)
    expect(empanadas?.boardPrefix).toBe('Empanada de')
    expect(empanadas?.items.map((item) => item.name)).toEqual(['Docena surtida'])
  })

  it('uses rows for described products and compact rows for short undescribed ones', () => {
    expect(byName('Hamburguesas')?.layout).toBe('rows')
    expect(byName('Bebidas')?.layout).toBe('compact')
    expect(byName('Cafetería')?.layout).toBe('compact')
    expect(byName('Postres')?.layout).toBe('compact')
  })

  it('does not build a flavor board from unpriced products', () => {
    expect(byName('Cafetería')?.boardItems).toEqual([])
  })
})

describe('prices', () => {
  it('reads the half price for half-and-half (RN-10)', () => {
    expect(halfPrice(product('Muzzarella'))).toBe(10500)
    expect(halfPrice(product('Coca-Cola 1,75 L'))).toBeNull()
  })

  it('offers every pizza with a half price as a half-and-half flavor (RF-56)', () => {
    expect(halfAndHalfCandidates(prototypeProducts, prototypeCategories)).toHaveLength(19)
  })

  it('offers only the whole pizza in the product sheet; halves go through "Armá tu pizza" (D1)', () => {
    expect(sheetVariants(product('Muzzarella')).map((variant) => variant.name)).toEqual(['Entera'])
    expect(sheetVariants(product('Ensaimada')).map((variant) => variant.name)).toEqual(['Mediana', 'Grande'])
  })

  it('never treats a missing price as orderable (RN-01)', () => {
    expect(orderableVariants(product('Gin tonic'))).toEqual([])
    expect(orderableVariants(product('Ensaimada'))).toHaveLength(2)
  })
})

describe('labels', () => {
  it('removes the shared board prefix and capitalizes the flavor', () => {
    expect(boardLabel('Empanada de carne picada', 'Empanada de')).toBe('Carne picada')
    expect(boardLabel('Docena surtida', 'Empanada de')).toBe('Docena surtida')
  })

  it('hides the meaningless "Unidad" label only when it is the single variant', () => {
    expect(visibleVariantName('Unidad', 1)).toBeUndefined()
    expect(visibleVariantName('Vaso', 1)).toBe('Vaso')
  })

  it('drops the repeated "Por encargo" prefix from the notice', () => {
    expect(madeToOrderDetail('Por encargo: pedir con 1 o 2 días de anticipación.')).toBe('Pedir con 1 o 2 días de anticipación.')
  })
})
