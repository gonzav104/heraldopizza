import type { SupabaseClient } from '@supabase/supabase-js'
import {
  DOZEN_CHOICE,
  type AdminPromotion,
  type AdminPromotionsRepository,
  type NewPromotion,
  type PromotionChanges,
} from '@/features/admin/promotions/admin-promotions'
import { AdminSaveError, saveError } from '@/features/admin/shared/admin-save'
import { updateGuardedRow, type Row } from '@/features/admin/shared/supabase-rows'

/**
 * Supabase adapter of the promotions (P5b), used only inside the lazy admin chunk with the signed-in client. Row level
 * security decides every read and write. An edit sends only the commercial columns, never the code, the id, the order,
 * or the composition, and is guarded by the row's `actualizado_en`. A new promotion is sent switched off explicitly.
 */

const COLUMNS =
  'id,codigo,titulo,descripcion,precio,visible,orden,vigente_desde,vigente_hasta,dias_semana,' +
  'eleccion_categoria_id,eleccion_unidades,actualizado_en,' +
  'categoria_eleccion:categorias!promociones_eleccion_categoria_id_fkey(visible)'

function unexpected(what: string): never {
  throw new AdminSaveError('unavailable', `Unexpected promotion data: ${what}`)
}

const text = (value: unknown, what: string) => (typeof value === 'string' ? value : unexpected(what))
const nonBlank = (value: unknown, what: string) => (text(value, what).trim() ? (value as string) : unexpected(what))
const flag = (value: unknown, what: string) => (typeof value === 'boolean' ? value : unexpected(what))
const integer = (value: unknown, what: string) =>
  typeof value === 'number' && Number.isInteger(value) ? value : unexpected(what)
const isoDate = (value: unknown, what: string) =>
  value === null ? null : /^\d{4}-\d{2}-\d{2}$/.test(text(value, what)) ? (value as string) : unexpected(what)

function weekdays(value: unknown): number[] | null {
  if (value === null) return null
  if (!Array.isArray(value) || value.length === 0) return unexpected('weekdays')
  const days = value.map((day) => integer(day, 'weekday'))
  return days.every((day) => day >= 0 && day <= 6) && new Set(days).size === days.length ? days : unexpected('weekdays')
}

function flavorChoice(row: Row): AdminPromotion['flavorChoice'] {
  const { eleccion_categoria_id: categoryId, eleccion_unidades: units } = row
  if (categoryId === null && units === null) return null
  if (categoryId === null || units === null) return unexpected('flavor choice')
  const category = row.categoria_eleccion as { visible?: unknown } | null
  return {
    categoryId: text(categoryId, 'flavor category'),
    units: integer(units, 'flavor units'),
    categoryVisible: flag(category?.visible, 'flavor category visibility'),
  }
}

function toPromotion(row: Row): AdminPromotion {
  const price = integer(row.precio, 'price')
  return {
    id: text(row.id, 'id'),
    code: /^promo-[a-z0-9]+(-[a-z0-9]+)*$/.test(text(row.codigo, 'code')) ? (row.codigo as string) : unexpected('code'),
    title: nonBlank(row.titulo, 'title'),
    description: row.descripcion === null ? null : nonBlank(row.descripcion, 'description'),
    price: price > 0 ? price : unexpected('price'),
    visible: flag(row.visible, 'visibility'),
    order: integer(row.orden, 'order'),
    activeFrom: isoDate(row.vigente_desde, 'start date'),
    activeTo: isoDate(row.vigente_hasta, 'end date'),
    weekdays: weekdays(row.dias_semana),
    flavorChoice: flavorChoice(row),
    updatedAt: text(row.actualizado_en, 'token'),
  }
}

/** Only the commercial columns, and only those the change names. */
function changesPayload(changes: PromotionChanges): Row {
  const payload: Row = {}
  if (changes.title !== undefined) payload.titulo = changes.title
  if (changes.description !== undefined) payload.descripcion = changes.description
  if (changes.price !== undefined) payload.precio = changes.price
  if (changes.visible !== undefined) payload.visible = changes.visible
  if (changes.activeFrom !== undefined) payload.vigente_desde = changes.activeFrom
  if (changes.activeTo !== undefined) payload.vigente_hasta = changes.activeTo
  if (changes.weekdays !== undefined) payload.dias_semana = changes.weekdays
  return payload
}

export class SupabaseAdminPromotions implements AdminPromotionsRepository {
  private readonly client: SupabaseClient

  constructor(client: SupabaseClient) {
    this.client = client
  }

  async load(): Promise<AdminPromotion[]> {
    const { data, error } = await this.client
      .from('promociones')
      .select(COLUMNS)
      .order('orden', { ascending: true })
      .order('codigo', { ascending: true })
    if (error) throw saveError(error)
    if (!Array.isArray(data)) return unexpected('promotions')
    return (data as unknown as Row[]).map(toPromotion)
  }

  async create(promotion: NewPromotion, order: number): Promise<AdminPromotion> {
    const dozen = promotion.kind === 'dozen'
    const { data, error } = await this.client
      .from('promociones')
      .insert({
        titulo: promotion.title,
        descripcion: promotion.description,
        precio: promotion.price,
        // Sent explicitly: a new promotion is published only when the administrator switches it on.
        visible: false,
        orden: order,
        vigente_desde: promotion.activeFrom,
        vigente_hasta: promotion.activeTo,
        dias_semana: promotion.weekdays,
        eleccion_categoria_id: dozen ? DOZEN_CHOICE.categoryId : null,
        eleccion_unidades: dozen ? DOZEN_CHOICE.units : null,
      })
      .select(COLUMNS)
    if (error) throw saveError(error)
    if (!Array.isArray(data) || data.length !== 1) return unexpected('created promotion')
    return toPromotion(data[0] as unknown as Row)
  }

  async update(id: string, changes: PromotionChanges, updatedAt: string): Promise<AdminPromotion> {
    return toPromotion(await updateGuardedRow(this.client, 'promociones', COLUMNS, id, changesPayload(changes), updatedAt))
  }
}
