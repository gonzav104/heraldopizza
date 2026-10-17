import type { Catalog, Category, Product, Variant } from '@/domain/catalog'

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

function optionalText(value: unknown, what: string): string | null {
  if (value === null) return null
  return text(value, what)
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
