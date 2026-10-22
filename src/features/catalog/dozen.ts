import { hasOrderablePrice, type FlavorChoice, type Product, type Variant } from '@/domain/catalog'
import { boardLabel, commonLeadingWords } from './presentation'

// The dozen to choose (P4): its flavors come from the catalog, never from a fixed list.

/** Flavors are sold by the unit; the assorted dozen (variant «Docena») is a product of its own, never a flavor. */
export const FLAVOR_VARIANT = 'Unidad'

export function unitVariant(product: Product): Variant | undefined {
  return product.variants.find((variant) => variant.name === FLAVOR_VARIANT)
}

/** Every flavor of the choice in the catalog, in menu order: its category's products sold by the unit. */
export function choiceFlavors(choice: FlavorChoice, products: Product[]): Product[] {
  return products
    .filter((product) => product.categoryId === choice.categoryId && unitVariant(product) !== undefined)
    .sort((a, b) => a.order - b.order)
}

/** Whether a flavor of the choice can be picked now: in stock, with a published unit price. */
export function isPickable(product: Product): boolean {
  const unit = unitVariant(product)
  return product.inStock && unit !== undefined && hasOrderablePrice(unit)
}

/** The flavors the configurator offers. */
export function pickableFlavors(choice: FlavorChoice, products: Product[]): Product[] {
  return choiceFlavors(choice, products).filter(isPickable)
}

/** Short names without the shared prefix: «Empanada de carne picada» → «Carne picada». */
export function flavorLabeler(flavors: Product[]): (product: Product) => string {
  const prefix = commonLeadingWords(flavors.map((product) => product.name))
  return (product) => boardLabel(product.name, prefix)
}
