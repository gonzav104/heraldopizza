import type { Ars } from '@/domain/catalog'

/**
 * Promotions as the admin panel manages them (P5b). `code` is the commercial code PostgreSQL generates and saved carts
 * keep: it is shown, never sent. The flavor choice is fixed when a promotion is created. `updatedAt` is the token read
 * from the database, kept as the exact text it returned: a save sends it back and is refused if the row changed.
 */
export interface AdminPromotion {
  id: string
  code: string
  title: string
  description: string | null
  price: Ars
  visible: boolean
  order: number
  /** ISO dates (YYYY-MM-DD), both included; null means no limit. */
  activeFrom: string | null
  activeTo: string | null
  /** 0 (Sunday) to 6 (Saturday); null means every day. */
  weekdays: number[] | null
  /** The dozen to choose, with whether its category is shown on the public menu; null for a closed combo. */
  flavorChoice: { categoryId: string; units: number; categoryVisible: boolean } | null
  updatedAt: string
}

/**
 * The only flavor choice the database accepts (P5a): 12 units of the Empanadas category, by its stable id from the
 * authorized catalog. A test checks it against the migration.
 */
export const DOZEN_CHOICE = { categoryId: 'e4f5b25a-de7f-5c2e-a05f-071bcc5aa6d4', units: 12 } as const

/** The commercial fields an administrator may change; never the code, the id, the order, or the composition. */
export interface PromotionChanges {
  title?: string
  description?: string | null
  price?: Ars
  visible?: boolean
  activeFrom?: string | null
  activeTo?: string | null
  weekdays?: number[] | null
}

/** A new promotion: a closed combo, or the dozen of empanadas to choose. It is created switched off. */
export interface NewPromotion {
  kind: 'closed' | 'dozen'
  title: string
  description: string | null
  price: Ars
  activeFrom: string | null
  activeTo: string | null
  weekdays: number[] | null
}

/** A promotion's place after a move, with the token the move left on it. */
export interface PromotionPosition {
  id: string
  order: number
  updatedAt: string
}

/** Port between the panel and the promotions storage. Each write returns the row as the database now holds it. */
export interface AdminPromotionsRepository {
  load(): Promise<AdminPromotion[]>
  /** Creates the promotion switched off, at `order`; the database generates its code. */
  create(promotion: NewPromotion, order: number): Promise<AdminPromotion>
  update(id: string, changes: PromotionChanges, updatedAt: string): Promise<AdminPromotion>
  /**
   * Swaps a promotion with its neighbor, all or nothing, if both still carry the tokens read (`{ id: updatedAt }`).
   * Returns every promotion's position and token as the database now holds them; only the two swapped tokens were
   * checked, so a caller must not adopt the others' tokens for content it read earlier.
   */
  move(id: string, neighborId: string, tokens: Record<string, string>): Promise<PromotionPosition[]>
}
