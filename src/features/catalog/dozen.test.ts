import { describe, expect, it } from 'vitest'
import type { Product } from '@/domain/catalog'
import { prototypeProducts } from '@/data/prototype-catalog'
import { prototypePromotions } from '@/data/prototype-promotions'
import { choiceFlavors, flavorLabeler, pickableFlavors } from './dozen'

const dozen = prototypePromotions.find((promotion) => promotion.title === 'Docena de empanadas a elección')
const choice = dozen?.flavorChoice
if (!choice) throw new Error('the dozen to choose has no flavor choice')

const product = (name: string): Product => {
  const found = prototypeProducts.find((item) => item.name === name)
  if (!found) throw new Error(name)
  return found
}

describe('the dozen to choose (P4)', () => {
  it('is the only promotion with a flavor choice: 12 units among the empanadas', () => {
    expect(prototypePromotions.filter((promotion) => promotion.flavorChoice).map((promotion) => promotion.title)).toEqual([
      'Docena de empanadas a elección',
    ])
    expect(choice.units).toBe(12)
    expect(choice.categoryId).toBe(product('Empanada de carne picada').categoryId)
  })

  it('offers the catalog flavors sold by the unit, in menu order, and never the assorted dozen', () => {
    expect(choiceFlavors(choice, prototypeProducts).map((item) => item.name)).toEqual([
      'Empanada de carne picada',
      'Empanada de humita',
      'Empanada de pollo',
      'Empanada de jamón y ananá',
      'Empanada de cebolla y queso',
      'Empanada de roquefort y jamón',
      'Empanada de jamón y queso',
      'Empanada de capresse',
      'Empanada de verdura',
      'Empanada de salchicha y cheddar',
    ])
    expect(choiceFlavors(choice, prototypeProducts).map((item) => item.name)).not.toContain('Docena surtida')
  })

  it('follows the catalog: a new flavor appears, one out of stock or without a unit price cannot be picked', () => {
    const verdura = product('Empanada de verdura')
    const products = prototypeProducts.map((item) =>
      item.name === 'Empanada de pollo'
        ? { ...item, inStock: false }
        : item.name === 'Empanada de humita'
          ? { ...item, variants: item.variants.map((variant) => ({ ...variant, price: null })) }
          : item,
    )
    const extra: Product = { ...verdura, id: 'empanada-nueva', name: 'Empanada de queso azul', order: 99 }

    const pickable = pickableFlavors(choice, [...products, extra]).map((item) => item.name)
    expect(pickable).toContain('Empanada de queso azul')
    expect(pickable).not.toContain('Empanada de pollo')
    expect(pickable).not.toContain('Empanada de humita')
    expect(choiceFlavors(choice, [...products, extra]).map((item) => item.name)).toContain('Empanada de pollo')
  })

  it('names the flavors without their shared prefix', () => {
    const label = flavorLabeler(choiceFlavors(choice, prototypeProducts))
    expect(label(product('Empanada de carne picada'))).toBe('Carne picada')
    expect(label(product('Empanada de jamón y queso'))).toBe('Jamón y queso')
  })
})
