import type { Catalog, Category, Product, Promotion, Variant, Weekday } from '@/domain/catalog'

/** The catalog response does not have the shape the menu expects. Nothing is guessed: the menu shows an error. */
export class CatalogDataError extends Error {
  override name = 'CatalogDataError'
}

function fail(what: string): never {
  throw new CatalogDataError(`Unexpected catalog data: ${what}`)
}

function record(value: unknown, what: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) fail(`${what} is not an object`)
  return value as Record<string, unknown>
}

function list(value: unknown, what: string): unknown[] {
  if (!Array.isArray(value)) fail(`${what} is not a list`)
  return value
}

function text(value: unknown, what: string): string {
  if (typeof value !== 'string' || value.trim() === '') fail(`${what} is not a non-empty text`)
  return value
}

/** Optional text: null, empty, or blank all mean "none" (the database allows an empty description). */
function optionalText(value: unknown, what: string): string | null {
  if (value === null) return null
  if (typeof value !== 'string') fail(`${what} is not a text`)
  return value.trim() === '' ? null : value
}

function integer(value: unknown, what: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value)) fail(`${what} is not an integer`)
  return value
}

function flag(value: unknown, what: string): boolean {
  if (typeof value !== 'boolean') fail(`${what} is not a boolean`)
  return value
}

/** Whole pesos (RN-02) or null when the price is not published. Never 0, never a guess (RN-01). */
function price(value: unknown, what: string): number | null {
  if (value === null) return null
  const amount = integer(value, what)
  if (amount <= 0) fail(`${what} is not a positive price`)
  return amount
}

const byOrder = <T extends { order: number }>(a: T, b: T) => a.order - b.order

function mapVariant(value: unknown): Variant & { order: number } {
  const row = record(value, 'variant')
  return {
    id: text(row.id, 'variant id'),
    name: text(row.nombre, 'variant name'),
    price: price(row.precio, 'variant price'),
    order: integer(row.orden, 'variant order'),
  }
}

function mapProduct(value: unknown, categoryId: string): Product {
  const row = record(value, 'product')
  const madeToOrder = flag(row.solo_por_encargo, 'product made-to-order flag')
  const variants = list(row.variantes, 'product variants').map(mapVariant).sort(byOrder)
  return {
    id: text(row.id, 'product id'),
    categoryId,
    name: text(row.nombre, 'product name'),
    description: optionalText(row.descripcion, 'product description'),
    madeToOrderNotice: madeToOrder ? text(row.aviso_encargo, 'made-to-order notice') : null,
    inStock: !flag(row.sin_stock, 'product stock flag'),
    order: integer(row.orden, 'product order'),
    variants: variants.map(({ id, name, price: amount }) => ({ id, name, price: amount })),
  }
}

/**
 * Pure translation from the database rows (Spanish names, as in the schema) to the domain model. The rows already
 * passed row level security, so they hold only what the public may see. Sorting here keeps the menu order stable
 * even if the API ever returns rows in another order.
 */
export function mapCatalogRows(rows: unknown): Pick<Catalog, 'categories' | 'products'> {
  const mapped = list(rows, 'catalog response').map((value) => {
    const row = record(value, 'category')
    const category: Category = {
      id: text(row.id, 'category id'),
      name: text(row.nombre, 'category name'),
      order: integer(row.orden, 'category order'),
      appliesDeliverySurcharge: flag(row.recargo_envio, 'category delivery surcharge flag'),
    }
    const products = list(row.productos, 'category products')
      .map((product) => mapProduct(product, category.id))
      .sort(byOrder)
    return { category, products }
  })
  mapped.sort((a, b) => a.category.order - b.category.order)
  return {
    categories: mapped.map(({ category }) => category),
    products: mapped.flatMap(({ products }) => products),
  }
}

const PROMOTION_CODE = /^promo-[a-z0-9]+(-[a-z0-9]+)*$/
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

function optionalDate(value: unknown, what: string): string | null {
  if (value === null) return null
  if (typeof value !== 'string' || !ISO_DATE.test(value)) fail(`${what} is not a date`)
  return value
}

/** Null means every day (an empty list), never "no day". Weekdays go from 0 (Sunday) to 6 (Saturday), no repeats. */
function weekdays(value: unknown, what: string): Weekday[] {
  if (value === null) return []
  const days = list(value, what).map((day) => integer(day, what))
  if (days.length === 0 || days.some((day) => day < 0 || day > 6) || new Set(days).size !== days.length) fail(`${what} are not valid weekdays`)
  return days as Weekday[]
}

function mapPromotion(value: unknown): { promotion: Promotion; order: number } {
  const row = record(value, 'promotion')
  const code = text(row.codigo, 'promotion code')
  if (!PROMOTION_CODE.test(code)) fail('promotion code has an unexpected shape')
  const amount = price(row.precio, 'promotion price')
  if (amount === null) fail('promotion price is missing')
  const choiceCategory = row.eleccion_categoria_id
  const choiceUnits = row.eleccion_unidades
  if ((choiceCategory === null) !== (choiceUnits === null)) fail('promotion flavor choice is incomplete')
  const promotion: Promotion = {
    // The commercial code, not the internal uuid: saved carts and the dozen's configurator refer to it.
    id: code,
    title: text(row.titulo, 'promotion title'),
    description: optionalText(row.descripcion, 'promotion description'),
    price: amount,
    // P5a stores no images.
    imageUrl: null,
    activeFrom: optionalDate(row.vigente_desde, 'promotion start date'),
    activeTo: optionalDate(row.vigente_hasta, 'promotion end date'),
    weekdays: weekdays(row.dias_semana, 'promotion weekdays'),
  }
  if (choiceCategory !== null) {
    const units = integer(choiceUnits, 'promotion flavor units')
    if (units <= 0) fail('promotion flavor units are not positive')
    promotion.flavorChoice = { categoryId: text(choiceCategory, 'promotion flavor category'), units }
  }
  return { promotion, order: integer(row.orden, 'promotion order') }
}

/**
 * Promotions as the public may see them (P5a): row level security already left out the hidden, expired, and
 * out-of-day ones, so nothing is filtered here. Strict like the catalog: a row that breaks the contract fails the
 * load instead of being guessed. Components and prices are never read from the title.
 */
export function mapPromotionRows(rows: unknown): Promotion[] {
  const mapped = list(rows, 'promotions response').map(mapPromotion)
  if (new Set(mapped.map(({ promotion }) => promotion.id)).size !== mapped.length) fail('promotion codes repeat')
  return mapped
    .sort((a, b) => a.order - b.order || (a.promotion.id < b.promotion.id ? -1 : a.promotion.id > b.promotion.id ? 1 : 0))
    .map(({ promotion }) => promotion)
}
