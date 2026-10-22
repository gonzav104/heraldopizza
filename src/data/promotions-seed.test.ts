import { describe, expect, it } from 'vitest'
import seed from '../../supabase/seed_promociones.sql?raw'
import { prototypePromotions } from './prototype-promotions'

// The seed of the eight original promotions (P5a) against the owner's data, kept verbatim in prototype-promotions.ts:
// same codes (saved carts hold them), titles, descriptions, prices, and flavor choice. Nothing else is invented.

const unquote = (value: string) => (value === 'null' ? null : value.slice(1, -1).replace(/''/g, "'"))

const ROW = /\('([0-9a-f-]{36})', '(promo-[a-z0-9-]+)', ('(?:[^']|'')*'), (null|'(?:[^']|'')*'), (\d+), (\d+), (null|'[0-9a-f-]{36}'), (null|\d+)\)/g
const rows = [...seed.matchAll(ROW)].map(([, id, codigo, titulo, descripcion, precio, orden, categoria, unidades]) => ({
  id,
  codigo,
  titulo: unquote(titulo),
  descripcion: unquote(descripcion),
  precio: Number(precio),
  orden: Number(orden),
  categoria: unquote(categoria),
  unidades: unidades === 'null' ? null : Number(unidades),
}))

describe('seed of the original promotions', () => {
  it('holds the eight owner promotions exactly, with the same codes saved carts use', () => {
    expect(rows.map(({ codigo, titulo, descripcion, precio }) => ({ codigo, titulo, descripcion, precio }))).toEqual(
      prototypePromotions.map((promotion) => ({
        codigo: promotion.id,
        titulo: promotion.title,
        descripcion: promotion.description,
        precio: promotion.price,
      })),
    )
    expect(rows.map((row) => row.codigo)).toContain('promo-docena-eleccion')
  })

  it('keeps the flavor choice of the dozen to choose and no other', () => {
    const withChoice = rows.filter((row) => row.categoria !== null)
    expect(withChoice).toHaveLength(1)
    const dozen = prototypePromotions.find((promotion) => promotion.flavorChoice)
    expect(withChoice[0]).toMatchObject({
      codigo: dozen?.id,
      categoria: dozen?.flavorChoice?.categoryId,
      unidades: dozen?.flavorChoice?.units,
    })
  })

  it('uses fixed, distinct internal ids and keeps the menu order', () => {
    expect(new Set(rows.map((row) => row.id)).size).toBe(8)
    expect(rows.map((row) => row.orden)).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
  })

  it('is idempotent and never overwrites what the administrator changed: only inserts missing codes', () => {
    expect(seed).toMatch(/on conflict \(codigo\) do nothing;/)
    expect(seed).not.toMatch(/\bupdate\b|\bdo update\b|\bdelete\b|\btruncate\b/i)
    expect(seed).not.toMatch(/vigente_desde|vigente_hasta|dias_semana/)
  })
})
