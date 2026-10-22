import { describe, expect, it } from 'vitest'
import { deliveryRateGroups } from '@/data/delivery-rates'
import { searchDeliveryRates } from './delivery-rates'

const places = (groupId: string) =>
  deliveryRateGroups.find((group) => group.id === groupId)?.tiers.flatMap((tier) => tier.places.map((place) => `${place} ${tier.price}`)) ?? []

describe('official motito rates (owner, 2026-10-22)', () => {
  it('holds the complete list: 14 tiers and 40 places for barrios and localidades, 9 tiers and 41 places for fábricas', () => {
    const [barrios, fabricas] = deliveryRateGroups
    expect(barrios.title).toBe('Barrios y localidades')
    expect(fabricas.title).toBe('Fábricas')
    expect(barrios.tiers.map((tier) => tier.price)).toEqual([2500, 3000, 3500, 4000, 4500, 5000, 5500, 7000, 7500, 8500, 10000, 11500, 13000, 18000])
    expect(fabricas.tiers.map((tier) => tier.price)).toEqual([3000, 3500, 4000, 5000, 6000, 6500, 7000, 8000, 10000])
    expect(places('barrios')).toHaveLength(40)
    expect(places('fabricas')).toHaveLength(41)
  })

  it('keeps Siderca barrio and Siderca fábrica apart, each with its own price', () => {
    expect(places('barrios')).toContain('Siderca 3000')
    expect(places('fabricas')).toContain('Siderca 3500')
  })
})

describe('searchDeliveryRates', () => {
  const found = (query: string) =>
    searchDeliveryRates(deliveryRateGroups, query).map((group) => ({
      id: group.id,
      places: group.tiers.flatMap((tier) => tier.places.map((place) => `${place} ${tier.price}`)),
    }))

  it('returns the whole list for an empty query', () => {
    expect(searchDeliveryRates(deliveryRateGroups, '  ')).toEqual(deliveryRateGroups)
  })

  it('finds places by part of the name, ignoring case and accents, in both groups', () => {
    expect(found('siderca')).toEqual([
      { id: 'barrios', places: ['Siderca 3000'] },
      { id: 'fabricas', places: ['Siderca 3500'] },
    ])
    expect(found('zarate')).toEqual([
      { id: 'barrios', places: ['Zárate (hasta Rivadavia) 10000', 'Zárate (después de Rivadavia) 11500', 'Zárate (barrios) 13000'] },
    ])
    expect(found('TREFILA')).toEqual([{ id: 'fabricas', places: ['Tréfila 3500'] }])
  })

  it('drops tiers and groups without matches, and returns nothing when nothing matches', () => {
    expect(found('toyota')).toEqual([{ id: 'fabricas', places: ['Toyota (Plantas 1, 2, 3 y 4) 10000'] }])
    expect(found('no existe')).toEqual([])
  })
})
