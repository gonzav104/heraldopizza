import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import { AdminSaveError } from '@/features/admin/shared/admin-save'
import { DOZEN_CHOICE } from '@/features/admin/promotions/admin-promotions'
import { SupabaseAdminPromotions } from '@/features/admin/promotions/supabase-admin-promotions'

type Result = { data: unknown; error: unknown }

/** A chainable stand-in for the supabase-js query builder that records every call and resolves to `result`. */
function fakeClient(result: Result) {
  const calls: { method: string; args: unknown[] }[] = []
  const builder: Record<string, unknown> = {}
  for (const method of ['select', 'insert', 'update', 'eq', 'order']) {
    builder[method] = (...args: unknown[]) => {
      calls.push({ method, args })
      return builder
    }
  }
  builder.then = (resolve: (value: Result) => void) => resolve(result)
  const client = {
    from: (...args: unknown[]) => {
      calls.push({ method: 'from', args })
      return builder
    },
    rpc: async (...args: unknown[]) => {
      calls.push({ method: 'rpc', args })
      return result
    },
  }
  return { calls, promotions: new SupabaseAdminPromotions(client as unknown as SupabaseClient) }
}

const token = '2026-10-22T19:00:00.123456+00:00'
const closed = {
  id: 'e5060c36-764f-5591-8256-d8225be1e24c',
  codigo: 'promo-tres-muzzarella',
  titulo: 'Tres pizzas Muzzarella',
  descripcion: null,
  precio: 42000,
  visible: true,
  orden: 7,
  vigente_desde: null,
  vigente_hasta: null,
  dias_semana: null,
  eleccion_categoria_id: null,
  eleccion_unidades: null,
  categoria_eleccion: null,
  actualizado_en: token,
}
const dozen = {
  ...closed,
  id: '0d0e1a3c-0000-5000-8000-000000000005',
  codigo: 'promo-docena-eleccion',
  titulo: 'Docena de empanadas a elección',
  precio: 36000,
  orden: 5,
  vigente_desde: '2026-11-01',
  vigente_hasta: '2026-11-30',
  dias_semana: [5, 6],
  eleccion_categoria_id: DOZEN_CHOICE.categoryId,
  eleccion_unidades: 12,
  categoria_eleccion: { visible: false },
}

describe('SupabaseAdminPromotions.load (P5b)', () => {
  it('reads every promotion with its token and flavor category, ordered by position and then code', async () => {
    const { calls, promotions } = fakeClient({ data: [closed, dozen], error: null })
    const loaded = await promotions.load()

    expect(calls[0]).toEqual({ method: 'from', args: ['promociones'] })
    expect(calls[1].method).toBe('select')
    expect(calls[1].args[0]).toContain('actualizado_en')
    expect(calls[1].args[0]).toContain('categoria_eleccion:categorias!promociones_eleccion_categoria_id_fkey(visible)')
    expect(calls.filter((call) => call.method === 'order').map((call) => call.args[0])).toEqual(['orden', 'codigo'])
    expect(loaded).toEqual([
      {
        id: closed.id,
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
        updatedAt: token,
      },
      expect.objectContaining({
        code: 'promo-docena-eleccion',
        activeFrom: '2026-11-01',
        activeTo: '2026-11-30',
        weekdays: [5, 6],
        flavorChoice: { categoryId: DOZEN_CHOICE.categoryId, units: 12, categoryVisible: false },
      }),
    ])
  })

  it.each([
    ['a code out of format', { codigo: 'Promo 1' }],
    ['a price of 0', { precio: 0 }],
    ['a decimal price', { precio: 1.5 }],
    ['an empty title', { titulo: ' ' }],
    ['a date out of format', { vigente_desde: '01/11/2026' }],
    ['a weekday out of range', { dias_semana: [7] }],
    ['an empty weekday list', { dias_semana: [] }],
    ['a flavor choice without units', { eleccion_categoria_id: DOZEN_CHOICE.categoryId }],
    ['a missing token', { actualizado_en: null }],
    ['a missing visibility', { visible: 'si' }],
  ])('rejects %s as unexpected data', async (_, changes) => {
    const { promotions } = fakeClient({ data: [{ ...closed, ...changes }], error: null })
    await expect(promotions.load()).rejects.toMatchObject({ name: 'AdminSaveError', reason: 'unavailable' })
  })

  it('turns a read error into the failure the panel shows', async () => {
    const { promotions } = fakeClient({ data: null, error: { code: '42501' } })
    await expect(promotions.load()).rejects.toMatchObject({ reason: 'forbidden' })
  })
})

describe('SupabaseAdminPromotions.update (P5b)', () => {
  it('sends only the commercial fields, guarded by the token, and returns the saved row', async () => {
    const { calls, promotions } = fakeClient({ data: [{ ...closed, precio: 45000 }], error: null })
    const saved = await promotions.update(
      closed.id,
      { title: 'Tres Muzza', description: null, price: 45000, visible: false, activeFrom: '2026-11-01', activeTo: null, weekdays: [5] },
      token,
    )

    expect(calls.find((call) => call.method === 'update')?.args[0]).toEqual({
      titulo: 'Tres Muzza',
      descripcion: null,
      precio: 45000,
      visible: false,
      vigente_desde: '2026-11-01',
      vigente_hasta: null,
      dias_semana: [5],
    })
    expect(calls.filter((call) => call.method === 'eq').map((call) => call.args)).toEqual([
      ['id', closed.id],
      ['actualizado_en', token],
    ])
    expect(saved.price).toBe(45000)
  })

  it('never sends the code, the id, the order, or the composition, even if asked to', async () => {
    const { calls, promotions } = fakeClient({ data: [closed], error: null })
    const sneaky = { visible: true, code: 'promo-otra', id: 'x', order: 1, flavorChoice: DOZEN_CHOICE } as never
    await promotions.update(closed.id, sneaky, token)
    expect(calls.find((call) => call.method === 'update')?.args[0]).toEqual({ visible: true })
  })

  it('treats zero updated rows as a conflict, never a success', async () => {
    const { promotions } = fakeClient({ data: [], error: null })
    await expect(promotions.update(closed.id, { visible: false }, token)).rejects.toMatchObject({ reason: 'conflict' })
  })

  it.each([
    ['23514', 'validation'],
    ['42501', 'forbidden'],
    ['PGRST301', 'unavailable'],
  ])('turns error %s into %s', async (code, reason) => {
    const { promotions } = fakeClient({ data: null, error: { code } })
    const failure = promotions.update(closed.id, { visible: false }, token)
    await expect(failure).rejects.toBeInstanceOf(AdminSaveError)
    await expect(failure).rejects.toMatchObject({ reason })
  })
})

describe('SupabaseAdminPromotions.create (P5b)', () => {
  const values = { title: 'Nueva', description: null, price: 30000, activeFrom: null, activeTo: null, weekdays: null }

  it('creates a closed combo switched off, at the given position, with no flavor choice and no code', async () => {
    const { calls, promotions } = fakeClient({ data: [{ ...closed, visible: false, orden: 9 }], error: null })
    const created = await promotions.create({ ...values, kind: 'closed' }, 9)

    expect(calls[0]).toEqual({ method: 'from', args: ['promociones'] })
    expect(calls.find((call) => call.method === 'insert')?.args[0]).toEqual({
      titulo: 'Nueva',
      descripcion: null,
      precio: 30000,
      visible: false,
      orden: 9,
      vigente_desde: null,
      vigente_hasta: null,
      dias_semana: null,
      eleccion_categoria_id: null,
      eleccion_unidades: null,
    })
    expect(created.code).toBe('promo-tres-muzzarella')
  })

  it('creates the dozen to choose with the Empanadas category and 12 units, and nothing else', async () => {
    const { calls, promotions } = fakeClient({ data: [{ ...dozen, visible: false }], error: null })
    await promotions.create({ ...values, kind: 'dozen' }, 9)
    expect(calls.find((call) => call.method === 'insert')?.args[0]).toMatchObject({
      visible: false,
      eleccion_categoria_id: DOZEN_CHOICE.categoryId,
      eleccion_unidades: 12,
    })
  })

  it('fails when the database does not return exactly the new row', async () => {
    const { promotions } = fakeClient({ data: [], error: null })
    await expect(promotions.create({ ...values, kind: 'closed' }, 9)).rejects.toMatchObject({ reason: 'unavailable' })
  })
})
