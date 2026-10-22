import type { Ars, Category, Product, Promotion } from '@/domain/catalog'
import { hasOrderablePrice } from '@/domain/catalog'
import { choiceFlavors, flavorLabeler, isPickable, unitVariant } from '@/features/catalog/dozen'
import { halfPrice, isWholeHalf, madeToOrderDetail, visibleVariantName } from '@/features/catalog/presentation'
import type { FlavorPick, OrderLine, PromotionOrderLine } from './order-lines'

// Reconciles order lines with the catalog already loaded (P2). Prices are looked up here, never stored in the order,
// so a stale price cannot survive in the saved order (RF-17). A line the current catalog cannot price is never dropped
// or counted as $ 0: it becomes an issue the customer reviews, and it is priced again once the catalog has it back.

export interface CatalogIndex {
  products: Map<string, Product>
  categories: Map<string, Category>
  promotions: Map<string, Promotion>
  /** Product id of every variant, to tell a variant that moved to another product from one that is gone. */
  variantProducts: Map<string, string>
}

export function indexCatalog(categories: Category[], products: Product[], promotions: Promotion[]): CatalogIndex {
  return {
    products: new Map(products.map((product) => [product.id, product])),
    categories: new Map(categories.map((category) => [category.id, category])),
    promotions: new Map(promotions.map((promotion) => [promotion.id, promotion])),
    variantProducts: new Map(products.flatMap((product) => product.variants.map((variant) => [variant.id, product.id]))),
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
  madeToOrder: MadeToOrderNote[]
  /** What the line holds, one entry per row («5 Carne picada»): the dozen's flavors, shared by the cart and the message. */
  parts: string[]
}

/**
 * Why a line cannot be ordered with the current catalog:
 * `missing`: the product, variant, or promotion is no longer in the catalog (deleted or hidden: the public menu cannot
 * tell them apart). `incompatible`: everything still exists, but the combination is no longer valid. `unavailable`:
 * it is in the catalog but cannot be ordered now (out of stock, or no published price).
 */
export type LineIssueKind = 'missing' | 'incompatible' | 'unavailable'

export interface LineIssue {
  line: OrderLine
  kind: LineIssueKind
  /** What can still be named, or a generic name when nothing is left ("Un producto que ya no está en la carta"). */
  title: string
  detail: string | null
  reason: string
}

const GONE = 'Ya no está en la carta.'
const CHANGED = 'Cambió en la carta: volvé a elegirlo.'

const issue = (line: OrderLine, kind: LineIssueKind, title: string, detail: string | null, reason: string): LineIssue => ({
  line,
  kind,
  title,
  detail,
  reason,
})

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

/** One line against the catalog: priced, or the issue that keeps it from being ordered. */
export function reconcileLine(line: OrderLine, index: CatalogIndex): ResolvedLine | LineIssue {
  switch (line.kind) {
    case 'product': {
      const product = index.products.get(line.productId)
      if (!product) return issue(line, 'missing', 'Un producto que ya no está en la carta', null, GONE)
      const variant = product.variants.find((item) => item.id === line.variantId)
      if (!variant) {
        return index.variantProducts.has(line.variantId)
          ? issue(line, 'incompatible', product.name, null, CHANGED)
          : issue(line, 'missing', product.name, null, 'Esa opción ya no está en la carta.')
      }
      const halfPizza = isWholeHalf(product) && variant.name === 'Media'
      const detail = halfPizza ? 'Media pizza' : (visibleVariantName(variant.name, product.variants.length) ?? null)
      if (!product.inStock) return issue(line, 'unavailable', product.name, detail, 'Sin stock por ahora.')
      // RN-01, policy A: a variant without a published price is shown as «Consultar en barra», never ordered.
      if (!hasOrderablePrice(variant)) {
        return issue(line, 'unavailable', product.name, detail, 'Se consulta en barra: no se puede pedir por acá.')
      }
      return {
        line,
        title: product.name,
        detail,
        messageLabel: halfPizza ? `Media pizza de ${product.name}` : detail ? `${product.name} (${detail})` : product.name,
        shortLabel: halfPizza ? `media pizza de ${product.name}` : detail ? `${product.name} ${lowerFirst(detail)}` : product.name,
        unitPrice: variant.price,
        subtotal: variant.price * line.quantity,
        madeToOrder: madeToOrderOf([product]),
        parts: [],
      }
    }
    case 'half': {
      const first = index.products.get(line.firstProductId)
      const second = index.products.get(line.secondProductId)
      if (!first || !second) {
        const known = first ?? second
        return issue(line, 'missing', 'Mitad y mitad', known?.name ?? null, known ? 'El otro gusto ya no está en la carta.' : 'Sus gustos ya no están en la carta.')
      }
      const flavors = `${first.name} + ${second.name}`
      const halves = [first, second]
      // D3: the same flavor twice is not a half-and-half.
      if (first.id === second.id) return issue(line, 'incompatible', 'Mitad y mitad', flavors, CHANGED)
      const notByHalves = halves.find((item) => !isWholeHalf(item))
      if (notByHalves) return issue(line, 'incompatible', 'Mitad y mitad', flavors, `${notByHalves.name} ya no se pide por mitades.`)
      const outOfStock = halves.find((item) => !item.inStock)
      if (outOfStock) return issue(line, 'unavailable', 'Mitad y mitad', flavors, `${outOfStock.name}: sin stock por ahora.`)
      const price = halfAndHalfPrice(first, second)
      if (!price) {
        const unpriced = halves.find((item) => halfPrice(item) === null) ?? first
        return issue(line, 'unavailable', 'Mitad y mitad', flavors, `${unpriced.name}: la media no tiene precio publicado.`)
      }
      return {
        line,
        title: 'Mitad y mitad',
        detail: flavors,
        messageLabel: `Pizza mitad y mitad (${flavors})`,
        shortLabel: `mitad y mitad de ${first.name} y ${second.name}`,
        unitPrice: price.total,
        subtotal: price.total * line.quantity,
        madeToOrder: madeToOrderOf([first, second]),
        parts: [],
      }
    }
    case 'promotion': {
      const promotion = index.promotions.get(line.promotionId)
      // Switched off, out of its dates or days, or gone: the public menu cannot tell them apart (row level security
      // hides all three), and for the customer they mean the same thing (P5a).
      if (!promotion) return issue(line, 'missing', 'Una promoción', null, 'Esta promoción ya no está disponible.')
      if (promotion.price <= 0) return issue(line, 'unavailable', promotion.title, 'Promo', 'No tiene precio publicado.')
      const flavors = reconcileFlavors(line, promotion, index)
      if ('reason' in flavors) return flavors
      return {
        line,
        title: promotion.title,
        detail: 'Promo',
        messageLabel: `${promotion.title} (Promo)`,
        shortLabel: `la promo ${promotion.title}`,
        // A fixed price, whatever the flavors (P4).
        unitPrice: promotion.price,
        subtotal: promotion.price * line.quantity,
        madeToOrder: [],
        parts: flavors.parts,
      }
    }
  }
}

const REBUILD = 'quitala y armala de nuevo.'

/**
 * The flavors of a promotion line against the catalog (P4). A closed combo has none. The dozen to choose needs readable
 * flavors adding up to its units, each still in the catalog, still one of its flavors, and orderable now. Nothing is
 * ever substituted: any problem keeps the line as an issue the customer removes.
 */
function reconcileFlavors(line: PromotionOrderLine, promotion: Promotion, index: CatalogIndex): { parts: string[] } | LineIssue {
  const choice = promotion.flavorChoice
  const fail = (kind: LineIssueKind, reason: string, picks: FlavorPick[] = []) =>
    issue(line, kind, promotion.title, flavorParts(picks, promotion, index).join(', ') || 'Promo', reason)
  if (!choice) {
    return line.flavors === undefined ? { parts: [] } : fail('incompatible', 'Esta promo no se arma con gustos: quitala y volvé a agregarla.')
  }
  const picks = line.flavors
  if (picks === undefined) return fail('incompatible', `No tiene los gustos elegidos: ${REBUILD}`)
  const total = picks.reduce((sum, pick) => sum + pick.quantity, 0)
  if (picks.length === 0 || total !== choice.units) return fail('incompatible', `Los gustos guardados no son válidos: ${REBUILD}`)
  const known = picks.filter((pick) => index.products.has(pick.productId))
  if (known.length < picks.length) return fail('missing', `Un gusto elegido ya no está en la carta: ${REBUILD}`, known)
  const flavors = choiceFlavors(choice, [...index.products.values()])
  for (const pick of picks) {
    const product = index.products.get(pick.productId)
    if (product && !flavors.includes(product)) return fail('incompatible', `${product.name} ya no se puede elegir en esta docena.`, picks)
  }
  const label = flavorLabeler(flavors)
  for (const pick of picks) {
    const product = index.products.get(pick.productId)
    if (!product || isPickable(product)) continue
    const reason = product.inStock && unitVariant(product) ? 'no se puede pedir por ahora.' : 'sin stock por ahora.'
    return fail('unavailable', `${label(product)}: ${reason}`, picks)
  }
  return { parts: flavorParts(picks, promotion, index) }
}

/** «5 Carne picada», in menu order, for the flavors the catalog still has. */
function flavorParts(picks: FlavorPick[], promotion: Promotion, index: CatalogIndex): string[] {
  const choice = promotion.flavorChoice
  if (!choice) return []
  const flavors = choiceFlavors(choice, [...index.products.values()])
  const label = flavorLabeler(flavors)
  return picks
    .map((pick) => ({ pick, product: index.products.get(pick.productId) }))
    .filter((entry): entry is { pick: FlavorPick; product: Product } => entry.product !== undefined)
    .sort((a, b) => a.product.order - b.product.order)
    .map(({ pick, product }) => `${pick.quantity} ${label(product)}`)
}

const isIssue = (item: ResolvedLine | LineIssue): item is LineIssue => 'reason' in item

/** `null` when the line cannot be priced now: it is never counted as $ 0. */
export function resolveLine(line: OrderLine, index: CatalogIndex): ResolvedLine | null {
  const item = reconcileLine(line, index)
  return isIssue(item) ? null : item
}

export interface OrderSummary {
  /** Lines priced with the current catalog: the only ones in the totals and the message. */
  lines: ResolvedLine[]
  /** Lines the customer must review or remove before continuing; kept in the order, never priced. */
  issues: LineIssue[]
  /** Units across priced lines ("3 productos"). */
  itemCount: number
  productsSubtotal: Ars
}

/** The order against the catalog already loaded: priced lines, issues, and totals from the priced lines only. */
export function reconcileOrder(lines: OrderLine[], index: CatalogIndex): OrderSummary {
  const reconciled = lines.map((line) => reconcileLine(line, index))
  const resolved = reconciled.filter((item): item is ResolvedLine => !isIssue(item))
  return {
    lines: resolved,
    issues: reconciled.filter(isIssue),
    itemCount: resolved.reduce((total, item) => total + item.line.quantity, 0),
    productsSubtotal: resolved.reduce((total, item) => total + item.subtotal, 0),
  }
}

/** No lines at all, priced or not. */
export function isEmptyOrder(summary: OrderSummary): boolean {
  return summary.lines.length === 0 && summary.issues.length === 0
}

/** The checkout opens only for an order with priced lines and nothing left to review (P2). */
export function isReadyForCheckout(summary: OrderSummary): boolean {
  return summary.itemCount > 0 && summary.issues.length === 0
}
