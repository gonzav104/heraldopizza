import { describe, expect, it } from 'vitest'
import { normalizeOptionalText, parsePrice, validateName, validateProductEdit } from '@/features/admin/catalog/catalog-edits'

describe('parsePrice', () => {
  it.each([
    ['16000', 16000],
    ['16.000', 16000],
    [' 1.250.000 ', 1250000],
    ['$ 16.000', 16000],
    ['500', 500],
  ])('reads %s as %d whole pesos', (input, price) => {
    expect(parsePrice(input)).toEqual({ ok: true, price })
  })

  it.each([
    ['empty', ''],
    ['blank', '   '],
    ['zero', '0'],
    ['negative', '-500'],
    ['decimal with comma', '16000,50'],
    ['decimal with a single dot', '16000.5'],
    ['misplaced thousands dot', '16.00'],
    ['text', 'dieciséis mil'],
    ['beyond the integer range', '3000000000'],
  ])('rejects %s, never turning it into 0 or null', (_label, input) => {
    expect(parsePrice(input)).toEqual({ ok: false, error: 'Ingresá un precio entero mayor a 0.' })
  })
})

describe('validateName', () => {
  it('trims the name', () => {
    expect(validateName('  Muzzarella  ')).toEqual({ ok: true, value: 'Muzzarella' })
  })

  it.each(['', '   ', '\t\n'])('rejects an empty or blank name (%j)', (input) => {
    expect(validateName(input)).toEqual({ ok: false, error: 'El nombre no puede quedar vacío.' })
  })
})

describe('normalizeOptionalText', () => {
  it('keeps text, trimmed', () => {
    expect(normalizeOptionalText('  Salsa y muzzarella. ')).toBe('Salsa y muzzarella.')
  })

  it.each(['', '   ', null])('turns %j into null, as the menu already reads blank text', (input) => {
    expect(normalizeOptionalText(input)).toBeNull()
  })
})

describe('validateProductEdit', () => {
  const base = { name: 'Ensaimada', description: '', madeToOrder: true, madeToOrderNotice: 'Pedir con un día.' }

  it('returns only the editable product fields, normalized', () => {
    expect(validateProductEdit(base)).toEqual({
      ok: true,
      changes: { name: 'Ensaimada', description: null, madeToOrder: true, madeToOrderNotice: 'Pedir con un día.' },
    })
  })

  it('asks for the notice when the product is made to order', () => {
    expect(validateProductEdit({ ...base, madeToOrderNotice: '  ' })).toEqual({
      ok: false,
      errors: { madeToOrderNotice: 'Escribí el aviso de anticipación.' },
    })
  })

  it('allows no notice when the product is not made to order', () => {
    expect(validateProductEdit({ ...base, madeToOrder: false, madeToOrderNotice: '' })).toEqual({
      ok: true,
      changes: { name: 'Ensaimada', description: null, madeToOrder: false, madeToOrderNotice: null },
    })
  })

  it('reports an empty name together with a missing notice', () => {
    expect(validateProductEdit({ ...base, name: ' ', madeToOrderNotice: '' })).toEqual({
      ok: false,
      errors: { name: 'El nombre no puede quedar vacío.', madeToOrderNotice: 'Escribí el aviso de anticipación.' },
    })
  })
})
