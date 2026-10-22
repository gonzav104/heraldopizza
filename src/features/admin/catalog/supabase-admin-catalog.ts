import type { SupabaseClient } from '@supabase/supabase-js'
import {
  AdminSaveError,
  type AdminCatalogRepository,
  type AdminCategory,
  type AdminProduct,
  type AdminVariant,
  type CategoryChanges,
  type PriceChange,
  type ProductChanges,
} from '@/features/admin/catalog/admin-catalog'
import { saveError } from '@/features/admin/shared/admin-save'
import { updateGuardedRow, type Row } from '@/features/admin/shared/supabase-rows'

/**
 * Supabase adapter of the admin catalog (U5), used only inside the lazy admin chunk. Writes go through row level
 * security as the signed-in user; this adapter never decides who may write. Each single-row update sends only the
 * columns the panel may change (never ids or other technical fields), is guarded by the row's `actualizado_en`, and
 * returns the row as saved. Prices go through actualizar_precios_producto(), all or nothing.
 */

const VARIANT_COLUMNS = 'id,nombre,precio,orden,actualizado_en'
const PRODUCT_COLUMNS = 'id,categoria_id,nombre,descripcion,solo_por_encargo,aviso_encargo,sin_stock,visible,orden,actualizado_en'
const CATEGORY_COLUMNS = 'id,nombre,visible,actualizado_en'
const CATALOG_SELECT =
  'id,nombre,orden,visible,actualizado_en,' +
  'productos(id,nombre,descripcion,solo_por_encargo,aviso_encargo,sin_stock,visible,orden,actualizado_en,' +
  `variantes(${VARIANT_COLUMNS}))`

function unexpected(what: string): never {
  throw new AdminSaveError('unavailable', `Unexpected catalog data: ${what}`)
}

const text = (value: unknown, what: string) => (typeof value === 'string' ? value : unexpected(what))
const optionalText = (value: unknown, what: string) => (value === null ? null : text(value, what))
const flag = (value: unknown, what: string) => (typeof value === 'boolean' ? value : unexpected(what))
const order = (value: unknown) => (typeof value === 'number' ? value : unexpected('orden'))
const list = (value: unknown, what: string): Row[] => (Array.isArray(value) ? (value as Row[]) : unexpected(what))

function price(value: unknown): number | null {
  if (value === null) return null
  return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : unexpected('precio')
}

const byOrder = (a: Row, b: Row) => order(a.orden) - order(b.orden)

function toVariant(row: Row): AdminVariant {
  return {
    id: text(row.id, 'variant id'),
    name: text(row.nombre, 'variant name'),
    price: price(row.precio),
    updatedAt: text(row.actualizado_en, 'variant token'),
  }
}

function toProductFields(row: Row, categoryId: string): Omit<AdminProduct, 'variants'> {
  return {
    id: text(row.id, 'product id'),
    categoryId,
    name: text(row.nombre, 'product name'),
    description: optionalText(row.descripcion, 'description'),
    madeToOrder: flag(row.solo_por_encargo, 'made-to-order flag'),
    madeToOrderNotice: optionalText(row.aviso_encargo, 'notice'),
    outOfStock: flag(row.sin_stock, 'stock flag'),
    visible: flag(row.visible, 'product visibility'),
    updatedAt: text(row.actualizado_en, 'product token'),
  }
}

function toCategoryFields(row: Row): Omit<AdminCategory, 'products'> {
  return {
    id: text(row.id, 'category id'),
    name: text(row.nombre, 'category name'),
    visible: flag(row.visible, 'category visibility'),
    updatedAt: text(row.actualizado_en, 'category token'),
  }
}

function productPayload(changes: ProductChanges): Row {
  const payload: Row = {}
  if (changes.name !== undefined) payload.nombre = changes.name
  if (changes.description !== undefined) payload.descripcion = changes.description
  if (changes.madeToOrder !== undefined) payload.solo_por_encargo = changes.madeToOrder
  if (changes.madeToOrderNotice !== undefined) payload.aviso_encargo = changes.madeToOrderNotice
  if (changes.outOfStock !== undefined) payload.sin_stock = changes.outOfStock
  if (changes.visible !== undefined) payload.visible = changes.visible
  return payload
}

function categoryPayload(changes: CategoryChanges): Row {
  const payload: Row = {}
  if (changes.name !== undefined) payload.nombre = changes.name
  if (changes.visible !== undefined) payload.visible = changes.visible
  return payload
}

export class SupabaseAdminCatalog implements AdminCatalogRepository {
  private readonly client: SupabaseClient

  constructor(client: SupabaseClient) {
    this.client = client
  }

  async load(): Promise<AdminCategory[]> {
    const { data, error } = await this.client
      .from('categorias')
      .select(CATALOG_SELECT)
      .order('orden', { ascending: true })
      .order('orden', { ascending: true, referencedTable: 'productos' })
      .order('orden', { ascending: true, referencedTable: 'productos.variantes' })
    if (error) throw saveError(error)
    return list(data, 'catalog')
      .sort(byOrder)
      .map((category) => {
        const fields = toCategoryFields(category)
        return {
          ...fields,
          products: list(category.productos, 'products')
            .sort(byOrder)
            .map((product) => ({
              ...toProductFields(product, fields.id),
              variants: list(product.variantes, 'variants').sort(byOrder).map(toVariant),
            })),
        }
      })
  }

  /** One row, only the allowed columns, guarded by its token (shared with the promotions). */
  private updateRow(table: string, columns: string, id: string, payload: Row, updatedAt: string): Promise<Row> {
    return updateGuardedRow(this.client, table, columns, id, payload, updatedAt)
  }

  async updateCategory(id: string, changes: CategoryChanges, updatedAt: string): Promise<Omit<AdminCategory, 'products'>> {
    return toCategoryFields(await this.updateRow('categorias', CATEGORY_COLUMNS, id, categoryPayload(changes), updatedAt))
  }

  async updateProduct(id: string, changes: ProductChanges, updatedAt: string): Promise<Omit<AdminProduct, 'variants'>> {
    const row = await this.updateRow('productos', PRODUCT_COLUMNS, id, productPayload(changes), updatedAt)
    return toProductFields(row, text(row.categoria_id, 'category id'))
  }

  async updatePrices(productId: string, changes: PriceChange[]): Promise<Pick<AdminVariant, 'id' | 'price' | 'updatedAt'>[]> {
    const { data, error } = await this.client.rpc('actualizar_precios_producto', {
      p_producto: productId,
      p_precios: changes.map((change) => ({ id: change.variantId, precio: change.price, actualizado_en: change.updatedAt })),
    })
    if (error) throw saveError(error)
    return list(data, 'saved prices').map((row) => ({
      id: text(row.id, 'variant id'),
      price: price(row.precio),
      updatedAt: text(row.actualizado_en, 'variant token'),
    }))
  }
}
