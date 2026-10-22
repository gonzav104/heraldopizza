import type { Ars, Category, Product, Variant } from '@/domain/catalog'
import { hasOrderablePrice } from '@/domain/catalog'

/**
 * How a category is laid out, derived from the shape of its data (never from its name):
 * - `pizza`: every product has whole and half prices (RF-60), with quick-add pills and the half-and-half entry.
 * - `rows`: most products have a description worth reading.
 * - `compact`: short items without description (drinks, coffee), one line each.
 */
export type SectionLayout = 'pizza' | 'rows' | 'compact'

export interface MenuSectionModel {
  category: Category
  layout: SectionLayout
  /** Same-price, single-variant, undescribed items shown as a flavor board with steppers (e.g. empanadas, RF-61). */
  boardItems: Product[]
  /** Common leading words removed from board item names ("Empanada de"). */
  boardPrefix: string
  items: Product[]
}

const WHOLE = 'Entera'
const HALF = 'Media'

export function isWholeHalf(product: Product): boolean {
  const names = product.variants.map((variant) => variant.name)
  return names.length === 2 && names.includes(WHOLE) && names.includes(HALF)
}

export function wholeHalfVariants(product: Product): { whole: Variant | undefined; half: Variant | undefined } {
  return {
    whole: product.variants.find((variant) => variant.name === WHOLE),
    half: product.variants.find((variant) => variant.name === HALF),
  }
}

/** Half price used by half-and-half (RN-10); `null` when the product has no orderable half. */
export function halfPrice(product: Product): Ars | null {
  const half = product.variants.find((variant) => variant.name === HALF)
  return half && hasOrderablePrice(half) ? half.price : null
}

export function orderableVariants(product: Product): (Variant & { price: Ars })[] {
  return product.variants.filter(hasOrderablePrice)
}

/**
 * Variants offered in the product sheet. Pizzas offer only the whole one: half pizzas and
 * half-and-half are built in "Armá tu pizza" (D1).
 */
export function sheetVariants(product: Product): (Variant & { price: Ars })[] {
  const orderable = orderableVariants(product)
  return isWholeHalf(product) ? orderable.filter((variant) => variant.name === WHOLE) : orderable
}

function isBoardCandidate(product: Product): boolean {
  return product.variants.length === 1 && product.description === null && product.variants[0].price !== null
}

export function commonLeadingWords(names: string[]): string {
  const split = names.map((name) => name.split(' '))
  const shortest = Math.min(...split.map((words) => words.length))
  const prefix: string[] = []
  for (let i = 0; i < shortest - 1; i++) {
    const word = split[0][i]
    if (split.every((words) => words[i] === word)) prefix.push(word)
    else break
  }
  return prefix.join(' ')
}

/** Strips the shared prefix and capitalizes the rest: "Empanada de carne picada" → "Carne picada". */
export function boardLabel(name: string, prefix: string): string {
  if (!prefix || !name.startsWith(`${prefix} `)) return name
  const rest = name.slice(prefix.length + 1)
  return rest.charAt(0).toLocaleUpperCase('es-AR') + rest.slice(1)
}

export function buildMenuSections(categories: Category[], products: Product[]): MenuSectionModel[] {
  return [...categories]
    .sort((a, b) => a.order - b.order)
    .map((category): MenuSectionModel => {
      const items = products.filter((product) => product.categoryId === category.id).sort((a, b) => a.order - b.order)

      if (items.length > 0 && items.every(isWholeHalf)) {
        return { category, layout: 'pizza', boardItems: [], boardPrefix: '', items }
      }

      const candidates = items.filter(isBoardCandidate)
      const sharedPrice = candidates[0]?.variants[0].price
      const board =
        candidates.length >= 4 && candidates.every((product) => product.variants[0].price === sharedPrice) ? candidates : []
      const rest = items.filter((product) => !board.includes(product))
      const described = rest.filter((product) => product.description !== null).length

      return {
        category,
        layout: described * 2 >= rest.length ? 'rows' : 'compact',
        boardItems: board,
        boardPrefix: board.length > 0 ? commonLeadingWords(board.map((product) => product.name)) : '',
        items: rest,
      }
    })
    .filter((section) => section.items.length + section.boardItems.length > 0)
}

/** Pizzas that can be one half of a half-and-half (RF-56): they have a published half price. */
export function halfAndHalfCandidates(products: Product[], categories: Category[]): Product[] {
  return buildMenuSections(categories, products)
    .filter((section) => section.layout === 'pizza')
    .flatMap((section) => section.items)
    .filter((product) => halfPrice(product) !== null)
}

export function sectionDomId(category: Category): string {
  return `categoria-${category.id}`
}

/** "Por encargo: pedir con…" → "Pedir con…" (the badge already says "Por encargo"). */
export function madeToOrderDetail(notice: string): string {
  const detail = notice.replace(/^Por encargo:\s*/i, '')
  return detail.charAt(0).toLocaleUpperCase('es-AR') + detail.slice(1)
}

/** "Unidad" says nothing to the customer, so it is not shown as a label. */
export function visibleVariantName(name: string, total: number): string | undefined {
  return total === 1 && name === 'Unidad' ? undefined : name
}
