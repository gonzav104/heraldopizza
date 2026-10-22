// Pure pieces of the final check before WhatsApp (P6a): what the customer was shown, compared with the same order
// priced against a fresh catalog. Availability is P2's (reconcileOrder and isReadyForCheckout); nothing here repeats it.
// The keys hold the checkout data, so they live in memory only: never in storage, URLs, telemetry, or logs.
import type { Ars } from '@/domain/catalog'
import { isReadyForCheckout, type OrderSummary } from '@/features/cart/line-pricing'
import type { OrderLine } from '@/features/cart/order-lines'
import { argentinaToday } from '@/lib/argentina-time'
import { computeTotals, type CheckoutDetails } from './prototype-order'

/** A verification lasts at most 10 minutes, and never past midnight in Argentina (owner decision, 2026-10-22). */
export const VERIFICATION_TTL_MS = 10 * 60 * 1000

/** What the cart holds, line by line and in order, without the generated line ids. */
export function cartKey(lines: OrderLine[]): string {
  return JSON.stringify(lines.map(lineKey))
}

function lineKey(line: OrderLine): string {
  switch (line.kind) {
    case 'product':
      return JSON.stringify(['product', line.productId, line.variantId, line.quantity, line.note])
    case 'half':
      return JSON.stringify(['half', line.firstProductId, line.secondProductId, line.quantity, line.note])
    case 'promotion':
      return JSON.stringify(['promotion', line.promotionId, line.quantity, line.note, line.flavors ?? null])
  }
}

/** The checkout data the WhatsApp message carries, as the message writes it (trimmed; the address only for delivery). */
export function checkoutKey(details: CheckoutDetails): string {
  return JSON.stringify([
    details.name.trim(),
    details.mode,
    details.mode === 'envio' ? details.address.trim() : '',
    details.payment,
    details.note.trim(),
  ])
}

export interface PricedLine {
  /** The line's identity (product, variant or halves or promotion, flavors, quantity, note). */
  key: string
  title: string
  detail: string | null
  quantity: number
  unitPrice: Ars
  subtotal: Ars
}

/** The order as the customer saw it priced: the basis for asking them to accept a change. */
export interface OrderSnapshot {
  cart: string
  checkout: string
  lines: PricedLine[]
  products: Ars
  creditSurcharge: Ars | null
  total: Ars
}

/** The order priced with the given summary, or null when P2 says it cannot be checked out. */
export function snapshotOf(lines: OrderLine[], summary: OrderSummary, details: CheckoutDetails): OrderSnapshot | null {
  if (!isReadyForCheckout(summary)) return null
  const totals = computeTotals(summary, details)
  return {
    cart: cartKey(lines),
    checkout: checkoutKey(details),
    lines: summary.lines.map((item) => ({
      key: lineKey(item.line),
      title: item.title,
      detail: item.detail,
      quantity: item.line.quantity,
      unitPrice: item.unitPrice,
      subtotal: item.subtotal,
    })),
    products: totals.products,
    creditSurcharge: totals.creditSurcharge,
    total: totals.total,
  }
}

export interface PriceChange {
  key: string
  title: string
  detail: string | null
  quantity: number
  before: { unitPrice: Ars; subtotal: Ars }
  after: { unitPrice: Ars; subtotal: Ars }
}

export interface OrderComparison {
  /** Same lines, quantities, variants, flavors, and notes. */
  sameCart: boolean
  /** Same data in the message (name, mode, address, payment, note). */
  sameCheckout: boolean
  /** Lines of the same cart whose price changed; empty when the carts differ (there is nothing to pair). */
  priceChanges: PriceChange[]
  totalBefore: Ars
  totalAfter: Ars
}

export function compareOrders(seen: OrderSnapshot, fresh: OrderSnapshot): OrderComparison {
  const sameCart = seen.cart === fresh.cart
  const before = new Map(seen.lines.map((line) => [line.key, line]))
  const priceChanges = sameCart
    ? fresh.lines.flatMap((line): PriceChange[] => {
        const old = before.get(line.key)
        if (!old || (old.unitPrice === line.unitPrice && old.subtotal === line.subtotal)) return []
        return [
          {
            key: line.key,
            title: line.title,
            detail: line.detail,
            quantity: line.quantity,
            before: { unitPrice: old.unitPrice, subtotal: old.subtotal },
            after: { unitPrice: line.unitPrice, subtotal: line.subtotal },
          },
        ]
      })
    : []
  return { sameCart, sameCheckout: seen.checkout === fresh.checkout, priceChanges, totalBefore: seen.total, totalAfter: fresh.total }
}

/** Whether a verification made at `verifiedAt` still holds at `now`: under 10 minutes and the same day in Argentina. */
export function isVerificationCurrent(verifiedAt: Date, now: Date): boolean {
  const elapsed = now.getTime() - verifiedAt.getTime()
  return elapsed >= 0 && elapsed < VERIFICATION_TTL_MS && argentinaToday(verifiedAt).date === argentinaToday(now).date
}
