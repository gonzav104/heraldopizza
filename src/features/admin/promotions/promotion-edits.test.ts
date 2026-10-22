import { describe, expect, it } from 'vitest'
import migration from '../../../../supabase/migrations/20261022190000_promociones.sql?raw'
import { DOZEN_CHOICE, type AdminPromotion } from '@/features/admin/promotions/admin-promotions'
import {
  argentinaToday,
  emptyPromotionForm,
  promotionForm,
  promotionStatus,
  validatePromotionForm,
  type PromotionForm,
} from '@/features/admin/promotions/promotion-edits'

const form = (changes: Partial<PromotionForm> = {}): PromotionForm => ({
  ...emptyPromotionForm,
  title: 'Tres pizzas Muzzarella',
  price: '42.000',
  ...changes,
})

describe('validatePromotionForm (P5b)', () => {
  it('returns the trimmed fields, the price in whole pesos, no limits, and every day', () => {
    expect(validatePromotionForm(form({ title: '  Tres pizzas  ', description: '  ' }))).toEqual({
      ok: true,
      values: {
        title: 'Tres pizzas',
        description: null,
        price: 42000,
        activeFrom: null,
        activeTo: null,
        weekdays: null,
      },
    })
  })

  it.each([
    ['an empty title', { title: '   ' }, { title: 'El título no puede quedar vacío.' }],
    ['a price of 0', { price: '0' }, { price: 'Ingresá un precio entero mayor a 0.' }],
    ['a price with decimals', { price: '42000,50' }, { price: 'Ingresá un precio entero mayor a 0.' }],
    ['no price', { price: '' }, { price: 'Ingresá un precio entero mayor a 0.' }],
    ['an end before the start', { from: '2026-11-30', to: '2026-11-01' }, { to: 'La fecha de fin no puede ser anterior a la de inicio.' }],
    ['a date that does not exist', { from: '2026-02-30' }, { from: 'Ingresá una fecha válida.' }],
    ['some days but none chosen', { everyDay: false, days: [] }, { days: 'Elegí al menos un día.' }],
  ])('rejects %s', (_, changes, errors) => {
    expect(validatePromotionForm(form(changes))).toEqual({ ok: false, errors })
  })

  it('keeps chosen days sorted and without repeats, and dates as they are', () => {
    const result = validatePromotionForm(form({ from: '2026-11-01', to: '2026-11-01', everyDay: false, days: [6, 0, 5, 6] }))
    expect(result).toMatchObject({ ok: true, values: { activeFrom: '2026-11-01', activeTo: '2026-11-01', weekdays: [0, 5, 6] } })
  })

  it('fills the form from a saved promotion and back without changes', () => {
    const saved = promotion({ description: 'No son a elección.', price: 32000, activeFrom: '2026-11-01', weekdays: [5, 6] })
    expect(promotionForm(saved)).toEqual({
      title: saved.title,
      description: 'No son a elección.',
      price: '32.000',
      from: '2026-11-01',
      to: '',
      everyDay: false,
      days: [5, 6],
    })
    expect(validatePromotionForm(promotionForm(saved))).toMatchObject({
      ok: true,
      values: { price: 32000, activeFrom: '2026-11-01', activeTo: null, weekdays: [5, 6] },
    })
  })
})

describe('argentinaToday (P5b)', () => {
  it.each([
    // 02:59 UTC on a Sunday is still Saturday 23:59 in Argentina (UTC−3), whatever this computer's time zone.
    ['2026-10-25T02:59:00Z', { date: '2026-10-24', weekday: 6 }],
    ['2026-10-25T03:00:00Z', { date: '2026-10-25', weekday: 0 }],
    ['2026-12-31T23:30:00Z', { date: '2026-12-31', weekday: 4 }],
  ])('at %s it is %o in Argentina', (instant, today) => {
    expect(argentinaToday(new Date(instant))).toEqual(today)
  })
})

function promotion(changes: Partial<AdminPromotion> = {}): AdminPromotion {
  return {
    id: 'u1',
    code: 'promo-tres-muzzarella',
    title: 'Tres pizzas Muzzarella',
    description: null,
    price: 42000,
    visible: true,
    order: 7,
    activeFrom: null,
    activeTo: null,
    weekdays: null,
    flavorChoice: null,
    updatedAt: 't0',
    ...changes,
  }
}

describe('promotionStatus (P5b)', () => {
  const today = { date: '2026-10-24', weekday: 6 }

  it.each([
    ['active with no limits', promotion(), 'active'],
    ['active on its first and last day', promotion({ activeFrom: '2026-10-24', activeTo: '2026-10-24' }), 'active'],
    ['switched off, whatever its dates', promotion({ visible: false, activeTo: '2026-01-01' }), 'disabled'],
    ['scheduled when it starts tomorrow', promotion({ activeFrom: '2026-10-25' }), 'scheduled'],
    ['expired when it ended yesterday', promotion({ activeTo: '2026-10-23' }), 'expired'],
    ['off today when today is not one of its days', promotion({ weekdays: [5] }), 'off-day'],
    ['on today when today is one of its days', promotion({ weekdays: [6] }), 'active'],
    [
      'hidden by its flavor category',
      promotion({ flavorChoice: { ...DOZEN_CHOICE, categoryVisible: false } }),
      'hidden-category',
    ],
    ['active with its flavor category visible', promotion({ flavorChoice: { ...DOZEN_CHOICE, categoryVisible: true } }), 'active'],
  ])('%s', (_, item, status) => {
    expect(promotionStatus(item, today)).toBe(status)
  })
})

describe('DOZEN_CHOICE (P5b)', () => {
  it('is the only flavor choice the database accepts: 12 units of the Empanadas category', () => {
    expect(DOZEN_CHOICE.units).toBe(12)
    expect(migration).toContain(`eleccion_categoria_id = '${DOZEN_CHOICE.categoryId}'`)
    expect(migration).toContain(`eleccion_unidades = ${DOZEN_CHOICE.units}`)
  })
})
