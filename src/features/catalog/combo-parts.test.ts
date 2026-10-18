import { describe, expect, it } from 'vitest'
import { comboParts } from './combo-parts'

describe('comboParts', () => {
  it('splits a combo title into its parts and reads what each one is from its own words', () => {
    expect(comboParts('Especial + Coca-Cola 1,75 + 6 empanadas de JyQ')).toEqual([
      { text: 'Especial', kind: 'pizza', count: null },
      { text: 'Coca-Cola 1,75', kind: 'drink', count: null },
      { text: '6 empanadas de JyQ', kind: 'empanada', count: 6 },
    ])
  })

  it('reads the quantity a part states: a number, a dozen, or a number word', () => {
    expect(comboParts('Docena de empanadas surtidas')).toEqual([{ text: 'Docena de empanadas surtidas', kind: 'empanada', count: 12 }])
    expect(comboParts('Tres pizzas Muzzarella')).toEqual([{ text: 'Tres pizzas Muzzarella', kind: 'pizza', count: 3 }])
    expect(comboParts('Muzza + 6 empanadas surtidas')).toEqual([
      { text: 'Muzza', kind: 'pizza', count: null },
      { text: '6 empanadas surtidas', kind: 'empanada', count: 6 },
    ])
  })

  it('names pizzas by flavor or by the word pizza', () => {
    expect(comboParts('Pizza Napolitana + Pizza Especial').map((part) => part.kind)).toEqual(['pizza', 'pizza'])
    expect(comboParts('Especial + Pizza Muzzarella').map((part) => part.kind)).toEqual(['pizza', 'pizza'])
  })

  it('leaves a part it cannot read without a picture, rather than guessing', () => {
    expect(comboParts('Flan casero')).toEqual([{ text: 'Flan casero', kind: null, count: null }])
  })

  it('reads only real number words as a quantity, never an inherited object key', () => {
    expect(comboParts('Constructor especial')).toEqual([{ text: 'Constructor especial', kind: 'pizza', count: null }])
  })

  it('keeps repeated parts, each on its own line', () => {
    expect(comboParts('Muzza + Muzza').map((part) => part.text)).toEqual(['Muzza', 'Muzza'])
  })
})
