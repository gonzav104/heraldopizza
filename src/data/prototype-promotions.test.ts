import { describe, expect, it } from 'vitest'
import { prototypePromotions } from '@/data/prototype-promotions'

// The owner's eight real promotions (2026-10-17), used only as prototype data until U9 brings a real source.
// This test pins them verbatim so nothing is invented, dropped, or re-priced by accident.
describe('prototype promotions', () => {
  it('are exactly the eight promotions the owner gave, with their prices', () => {
    expect(prototypePromotions.map((promotion) => [promotion.title, promotion.price])).toEqual([
      ['Muzza + 6 empanadas surtidas', 32000],
      ['Especial + Pizza Muzzarella', 35000],
      ['Especial + Coca-Cola 1,75 + 6 empanadas de JyQ', 42500],
      ['Docena de empanadas surtidas', 30000],
      ['Docena de empanadas a elección', 36000],
      ['Muzza + Especial + 6 empanadas de JyQ', 52000],
      ['Tres pizzas Muzzarella', 42000],
      ['Pizza Napolitana + Pizza Especial', 42000],
    ])
  })

  it('keep the owner’s clarification and invent nothing else', () => {
    expect(prototypePromotions[0].description).toBe('No son a elección.')
    expect(prototypePromotions.slice(1).every((promotion) => promotion.description === null)).toBe(true)
    expect(prototypePromotions.every((promotion) => promotion.imageUrl === null)).toBe(true)
    expect(prototypePromotions.every((promotion) => promotion.activeFrom === null && promotion.activeTo === null)).toBe(true)
  })

  it('have unique ids', () => {
    expect(new Set(prototypePromotions.map((promotion) => promotion.id)).size).toBe(8)
  })
})
