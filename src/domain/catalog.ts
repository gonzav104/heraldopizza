// Catalog model shared by the public menu. U1 adds the business rules and the data adapter.

/** Whole Argentine pesos (RN-02): never decimals. */
export type Ars = number

export interface Variant {
  id: string
  name: string
  /** `null` means the price is not published ("Consultar en barra"). */
  price: Ars | null
}

export interface Product {
  id: string
  categoryId: string
  name: string
  description: string | null
  variants: Variant[]
  /** Advance-notice text for made-to-order products (RF-06). */
  madeToOrderNotice: string | null
  // No product photos in this version (owner decision D5); each category has a graphic instead.
  inStock: boolean
  order: number
}

export interface Category {
  id: string
  name: string
  order: number
  /** Whether each item adds the per-item delivery surcharge (RF-62). */
  appliesDeliverySurcharge: boolean
}

export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6

/**
 * A combo whose contents the customer picks (P4): exactly `units` units among the flavors of one category that are
 * sold by the unit. The price stays the combo's own, whatever the flavors.
 */
export interface FlavorChoice {
  categoryId: string
  units: number
}

/** Fixed combo with its own price (RN-13). Visibility rules (RF-11, RN-05) arrive with U10. */
export interface Promotion {
  id: string
  title: string
  description: string | null
  price: Ars
  imageUrl: string | null
  /** Validity window (RF-43); null while it is not defined. Visibility rules arrive with the real source (U9). */
  activeFrom: string | null
  activeTo: string | null
  weekdays: Weekday[]
  /** Present only for a combo the customer fills in (the dozen to choose); absent for a closed combo. */
  flavorChoice?: FlavorChoice
}

/** Everything the public menu shows. */
export interface Catalog {
  categories: Category[]
  products: Product[]
  promotions: Promotion[]
}

/** Port for reading the menu: the Supabase adapter in the app, the fixture in tests and in `#sistema`. */
export interface CatalogRepository {
  load(signal?: AbortSignal): Promise<Catalog>
}

/** A variant can be ordered only when it has a positive price (RN-01). */
export function hasOrderablePrice(variant: Variant): variant is Variant & { price: Ars } {
  return variant.price !== null && variant.price > 0
}
