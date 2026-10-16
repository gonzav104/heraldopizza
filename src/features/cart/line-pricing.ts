import type { Ars, Category, Product, Promotion } from '@/domain/catalog'
import { hasOrderablePrice } from '@/domain/catalog'
import { halfPrice, isWholeHalf, madeToOrderDetail, visibleVariantName } from '@/features/catalog/presentation'
import type { OrderLine } from './order-lines'

// Resolves order lines against the current catalog. Prices are looked up here, never stored in the order,
// so a stale price cannot survive once U5 persists the order.

export interface CatalogIndex {
  products: Map<string, Product>
  categories: Map<string, Category>
  promotions: Map<string, Promotion>
}

export function indexCatalog(categories: Category[], products: Product[], promotions: Promotion[]): CatalogIndex {
  return {
    products: new Map(products.map((product) => [product.id, product])),
    categories: new Map(categories.map((category) => [category.id, category])),
    promotions: new Map(promotions.map((promotion) => [promotion.id, promotion])),
  }
}

export interface MadeToOrderNote {
  name: string
  notice: string
}

export interface ResolvedLine {
  line: OrderLine
  /** Cart title: "Muzzarella", "Mitad y mitad", or the promo title. */
  title: string
  /** Cart detail: "Entera", "Media pizza", "Muzzarella + Napolitana Heraldo", or `null`. */
  detail: string | null
  /** WhatsApp message wording: "Muzzarella (Entera)", "Media pizza de Muzzarella", "Pizza mitad y mitad (A + B)". */
  messageLabel: string
  /** Feedback wording after "Agregaste" / "Quitaste": "Muzzarella entera", "media pizza de Muzzarella". */
  shortLabel: string
  unitPrice: Ars
  subtotal: Ars
  /** Pizzas this line adds to the per-pizza delivery surcharge (RF-62). */
  pizzaUnits: number
  madeToOrder: MadeToOrderNote[]
}

/** Half-and-half price: the sum of both half prices (RN-10). */
export function halfAndHalfPrice(first: Product, second: Product): { first: Ars; second: Ars; total: Ars } | null {
  const firstPrice = halfPrice(first)
  const secondPrice = halfPrice(second)
  if (firstPrice === null || secondPrice === null) return null
  return { first: firstPrice, second: secondPrice, total: firstPrice + secondPrice }
}

function madeToOrderOf(products: Product[]): MadeToOrderNote[] {
  return products
    .filter((product, position) => product.madeToOrderNotice && products.indexOf(product) === position)
    .map((product) => ({ name: product.name, notice: madeToOrderDetail(product.madeToOrderNotice ?? '') }))
}

const lowerFirst = (text: string) => text.charAt(0).toLocaleLowerCase('es-AR') + text.slice(1)

/** `null` when the line cannot be priced (missing product or no published price): it is never counted as $ 0. */
export function resolveLine(line: OrderLine, index: CatalogIndex): ResolvedLine | null {
  switch (line.kind) {
    case 'product': {
      const product = index.products.get(line.productId)
      const variant = product?.variants.find((item) => item.id === line.variantId)
      if (!product || !variant || !hasOrderablePrice(variant)) return null
      const surcharged = index.categories.get(product.categoryId)?.appliesDeliverySurcharge ?? false
      const halfPizza = isWholeHalf(product) && variant.name === 'Media'
      const detail = halfPizza ? 'Media pizza' : (visibleVariantName(variant.name, product.variants.length) ?? null)
      return {
        line,
        title: product.name,
        detail,
        messageLabel: halfPizza ? `Media pizza de ${product.name}` : detail ? `${product.name} (${detail})` : product.name,
        shortLabel: halfPizza ? `media pizza de ${product.name}` : detail ? `${product.name} ${lowerFirst(detail)}` : product.name,
        unitPrice: variant.price,
        subtotal: variant.price * line.quantity,
        pizzaUnits: surcharged ? line.quantity : 0,
        madeToOrder: madeToOrderOf([product]),
      }
    }
    case 'half': {
      const first = index.products.get(line.firstProductId)
      const second = index.products.get(line.secondProductId)
      const price = first && second ? halfAndHalfPrice(first, second) : null
      // D3: the same flavor twice is not a half-and-half.
      if (!first || !second || !price || first.id === second.id) return null
      const flavors = `${first.name} + ${second.name}`
      return {
        line,
        title: 'Mitad y mitad',
        detail: flavors,
        messageLabel: `Pizza mitad y mitad (${flavors})`,
        shortLabel: `mitad y mitad de ${first.name} y ${second.name}`,
        unitPrice: price.total,
        subtotal: price.total * line.quantity,
        // A half-and-half counts as one pizza (RN-10).
        pizzaUnits: line.quantity,
        madeToOrder: madeToOrderOf([first, second]),
      }
    }
    case 'promotion': {
      const promotion = index.promotions.get(line.promotionId)
      if (!promotion) return null
      return {
        line,
        title: promotion.title,
        detail: 'Promo',
        messageLabel: `${promotion.title} (Promo)`,
        shortLabel: `la promo ${promotion.title}`,
        unitPrice: promotion.price,
        subtotal: promotion.price * line.quantity,
        // PROTOTYPE: promotions have no component list yet, so they add no pizza surcharge. U10 decides.
        pizzaUnits: 0,
        madeToOrder: [],
      }
    }
  }
}

export interface OrderSummary {
  lines: ResolvedLine[]
  /** Units across priced lines ("3 productos"). */
  itemCount: number
  productsSubtotal: Ars
  pizzaCount: number
}

export function summarizeOrder(lines: OrderLine[], index: CatalogIndex): OrderSummary {
  const resolved = lines.map((line) => resolveLine(line, index)).filter((line) => line !== null)
  return {
    lines: resolved,
    itemCount: resolved.reduce((total, item) => total + item.line.quantity, 0),
    productsSubtotal: resolved.reduce((total, item) => total + item.subtotal, 0),
    pizzaCount: resolved.reduce((total, item) => total + item.pizzaUnits, 0),
  }
}
