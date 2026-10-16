import { describe, expect, it } from 'vitest'
import type { Product } from '@/domain/catalog'
import { prototypeCategories, prototypeProducts } from '@/data/prototype-catalog'
import {
  assignFlavor,
  buildPizzaLine,
  builderMode,
  builderPrice,
  clearSlot,
  initBuilder,
  isTakenByOtherSlot,
  modeLabels,
  priceAnnouncement,
  priceLine,
  selectSlot,
} from './pizza-builder'
import { halfAndHalfCandidates } from './presentation'

const candidates = halfAndHalfCandidates(prototypeProducts, prototypeCategories)
const product = (name: string): Product => {
  const found = prototypeProducts.find((item) => item.name === name)
  if (!found) throw new Error(name)
  return found
}
const muzza = product('Muzzarella')
const napo = product('Napolitana Heraldo')
const especial = product('Especial')
// Intl uses a no-break space after "$"; compare with plain spaces.
const plain = (text: string) => text.replace(/\u00a0/g, ' ')

describe('builder state', () => {
  it('starts empty on the first slot, or on the second when a flavor is preselected', () => {
    expect(initBuilder()).toEqual({ first: null, second: null, active: 'first' })
    expect(initBuilder(muzza.id)).toEqual({ first: muzza.id, second: null, active: 'second' })
  })

  it('assigns to the active slot and auto-advances to an empty second slot', () => {
    const state = assignFlavor(initBuilder(), muzza.id)
    expect(state).toEqual({ first: muzza.id, second: null, active: 'second' })
    expect(assignFlavor(state, napo.id)).toEqual({ first: muzza.id, second: napo.id, active: 'second' })
  })

  it('replaces the first flavor without moving when the second is already chosen', () => {
    const state = selectSlot({ first: muzza.id, second: napo.id, active: 'second' }, 'first')
    expect(assignFlavor(state, especial.id)).toEqual({ first: especial.id, second: napo.id, active: 'first' })
  })

  it('never puts the same flavor in both halves (D3)', () => {
    const state = { first: muzza.id, second: null, active: 'second' as const }
    expect(isTakenByOtherSlot(state, muzza.id)).toBe(true)
    expect(isTakenByOtherSlot(state, napo.id)).toBe(false)
    expect(assignFlavor(state, muzza.id)).toBe(state)
  })

  it('keeps the second slot unreachable until the first is chosen', () => {
    const state = selectSlot(initBuilder(), 'second')
    expect(state.active).toBe('first')
  })

  it('promotes the second flavor when the first is cleared', () => {
    expect(clearSlot({ first: muzza.id, second: napo.id, active: 'second' }, 'first')).toEqual({
      first: napo.id,
      second: null,
      active: 'second',
    })
  })

  it('goes back to one flavor when the second is cleared, and to empty when the only one is cleared', () => {
    expect(clearSlot({ first: muzza.id, second: napo.id, active: 'first' }, 'second')).toEqual({
      first: muzza.id,
      second: null,
      active: 'second',
    })
    expect(clearSlot({ first: muzza.id, second: null, active: 'second' }, 'first')).toEqual(initBuilder())
  })
})

describe('mode and price', () => {
  it('names what is being built', () => {
    expect(modeLabels[builderMode(initBuilder())]).toBe('Elegí el primer gusto')
    expect(modeLabels[builderMode(initBuilder(muzza.id))]).toBe('Media pizza')
    expect(modeLabels[builderMode({ first: muzza.id, second: napo.id, active: 'second' })]).toBe('Mitad y mitad')
  })

  it('prices one flavor as a half and two flavors as the sum of both halves (D2, RN-10)', () => {
    expect(builderPrice(initBuilder(), candidates)).toBeNull()

    const media = builderPrice(initBuilder(muzza.id), candidates)
    expect(media).toEqual({ mode: 'media', total: 10500 })
    expect(plain(priceLine(media!))).toBe('$ 10.500')
    expect(plain(priceAnnouncement(media!))).toBe('Media pizza: $ 10.500')

    const mitad = builderPrice({ first: muzza.id, second: napo.id, active: 'second' }, candidates)
    expect(mitad).toEqual({ mode: 'mitad', first: 10500, second: 14500, total: 25000 })
    expect(plain(priceLine(mitad!))).toBe('$ 10.500 + $ 14.500 = $ 25.000')
    expect(plain(priceAnnouncement(mitad!))).toBe('Mitad y mitad: $ 10.500 + $ 14.500 = $ 25.000')
  })
})

describe('buildPizzaLine', () => {
  it('turns one flavor into a product line with the Media variant (D2)', () => {
    const half = muzza.variants.find((variant) => variant.name === 'Media')
    expect(buildPizzaLine(initBuilder(muzza.id), candidates, 2, 'bien cocida')).toEqual({
      kind: 'product',
      productId: muzza.id,
      variantId: half?.id,
      quantity: 2,
      note: 'bien cocida',
    })
  })

  it('turns two flavors into a half line, stored in catalog order so A+B equals B+A', () => {
    const line = { kind: 'half', firstProductId: muzza.id, secondProductId: napo.id, quantity: 1, note: '' }
    expect(buildPizzaLine({ first: napo.id, second: muzza.id, active: 'second' }, candidates, 1, '')).toEqual(line)
    expect(buildPizzaLine({ first: muzza.id, second: napo.id, active: 'second' }, candidates, 1, '')).toEqual(line)
  })

  it('builds nothing without a first flavor', () => {
    expect(buildPizzaLine(initBuilder(), candidates, 1, '')).toBeNull()
  })
})
