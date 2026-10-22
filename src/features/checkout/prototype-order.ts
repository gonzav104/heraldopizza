// The order's business rules, in one place for the form, the summary card, the message, and «Info» (P3).
// Business facts come from docs/requerimientos.pdf and the owner's decisions: RN-11 (payments), RN-15 / RF-62
// (per-pizza surcharge, its own line), RN-17 (credit surcharge), RF-63 (zones; the real list is still missing, so only
// "Otra zona" exists). Anything not known yet is shown «A confirmar» and kept out of a total labeled «Total parcial».
import type { Ars } from '@/domain/catalog'
import { storeInfo } from '@/data/store-info'
import { formatArs } from '@/lib/money'
import type { OrderSummary } from '@/features/cart/line-pricing'

export const DELIVERY_SURCHARGE_PER_PIZZA: Ars = 1000
export const CREDIT_SURCHARGE_PERCENT = 8

export type FulfillmentMode = 'envio' | 'retiro'
export type PaymentMethod = 'efectivo' | 'transferencia' | 'debito' | 'credito'

export const modeLabels: Record<FulfillmentMode, string> = { envio: 'Envío', retiro: 'Retiro' }

export interface ZoneOption {
  id: string
  label: string
  /** Pinned options stay visible whatever the search says. */
  pinned: boolean
  /** Shipping cost for the zone; `null` when the store confirms it per order. */
  cost: Ars | null
}

export const OTHER_ZONE: ZoneOption = { id: 'otra-zona', label: 'Otra zona (a consultar)', pinned: true, cost: null }

/** The barrios and fábricas (RF-63) go before the pinned last option, with their cost, once the owner provides them. Never invent them. */
export const zoneOptions: ZoneOption[] = [OTHER_ZONE]

export interface PaymentOption {
  id: PaymentMethod
  label: string
  note?: string
}

const cash: PaymentOption = { id: 'efectivo', label: 'Efectivo' }
const transfer: PaymentOption = { id: 'transferencia', label: 'Transferencia' }
const debit: PaymentOption = { id: 'debito', label: 'Débito' }
const credit: PaymentOption = { id: 'credito', label: 'Crédito', note: `+${CREDIT_SURCHARGE_PERCENT} %` }

/** RN-11: delivery takes cash or transfer; pickup also takes debit and credit. */
export function paymentOptions(mode: FulfillmentMode): PaymentOption[] {
  return mode === 'envio' ? [cash, transfer] : [cash, transfer, debit, credit]
}

export function paymentLabel(method: PaymentMethod): string {
  return [cash, transfer, debit, credit].find((option) => option.id === method)?.label ?? method
}

export interface CheckoutDetails {
  name: string
  mode: FulfillmentMode | null
  address: string
  zoneId: string | null
  payment: PaymentMethod | null
  note: string
}

export const emptyCheckout: CheckoutDetails = { name: '', mode: null, address: '', zoneId: null, payment: null, note: '' }

/** Changing the mode drops a payment the new mode does not accept (e.g. credit when switching to delivery). */
export function withMode(details: CheckoutDetails, mode: FulfillmentMode): CheckoutDetails {
  const allowed = paymentOptions(mode).some((option) => option.id === details.payment)
  return { ...details, mode, payment: allowed ? details.payment : null }
}

export type CheckoutField = 'name' | 'mode' | 'address' | 'zone' | 'payment'
export type CheckoutErrors = Partial<Record<CheckoutField, string>>

/** Field order matters: the form focuses the first invalid field. */
export const checkoutFieldOrder: CheckoutField[] = ['name', 'mode', 'address', 'zone', 'payment']

export function validateCheckout(details: CheckoutDetails): CheckoutErrors {
  const errors: CheckoutErrors = {}
  // First and last name: at least two words, so the store knows who to ask for.
  if (details.name.trim().split(/\s+/).filter(Boolean).length < 2) errors.name = 'Escribí tu nombre y apellido.'
  if (!details.mode) errors.mode = 'Elegí envío o retiro.'
  if (details.mode === 'envio') {
    if (!details.address.trim()) errors.address = 'Escribí la dirección para el envío.'
    if (!zoneOptions.some((zone) => zone.id === details.zoneId)) errors.zone = 'Elegí tu zona.'
  }
  if (!details.payment) errors.payment = 'Elegí cómo vas a pagar.'
  else if (details.mode && !paymentOptions(details.mode).some((option) => option.id === details.payment)) {
    errors.payment = 'Con envío se paga en efectivo o por transferencia.'
  }
  return errors
}

/** Shipping: none for pickup, a known zone cost, or «A confirmar» (no zone yet, or a zone without a cost). */
export type ShippingCost = { kind: 'none' } | { kind: 'to-confirm' } | { kind: 'amount'; amount: Ars }

export interface OrderTotals {
  products: Ars
  /** $ 1.000 per pizza with a known count, on delivery only (RN-15, D4). */
  pizzaSurcharge: { count: number; unit: Ars; amount: Ars } | null
  /** Delivery with promotion pizzas whose count is not confirmed: their surcharge is «A confirmar». */
  promoPizzasToConfirm: boolean
  shipping: ShippingCost
  creditSurcharge: Ars | null
  /** Sum of the known amounts only. */
  total: Ars
  /** Nothing is left to confirm: only then it is the orientative total, not a partial one. */
  complete: boolean
}

export function computeTotals(
  order: Pick<OrderSummary, 'productsSubtotal' | 'pizzaCount' | 'pizzasToConfirm'>,
  details: Pick<CheckoutDetails, 'mode' | 'payment' | 'zoneId'>,
  zones: ZoneOption[] = zoneOptions,
): OrderTotals {
  const products = order.productsSubtotal
  const delivery = details.mode === 'envio'
  const pizzaSurcharge =
    delivery && order.pizzaCount > 0
      ? { count: order.pizzaCount, unit: DELIVERY_SURCHARGE_PER_PIZZA, amount: order.pizzaCount * DELIVERY_SURCHARGE_PER_PIZZA }
      : null
  const promoPizzasToConfirm = delivery && order.pizzasToConfirm
  const zoneCost = zones.find((zone) => zone.id === details.zoneId)?.cost ?? null
  const shipping: ShippingCost = !delivery ? { kind: 'none' } : zoneCost === null ? { kind: 'to-confirm' } : { kind: 'amount', amount: zoneCost }
  // Credit is a pickup payment (RN-11): its 8 % applies to products only, never to delivery charges (RN-17), in whole
  // pesos rounded to the nearest (RN-02). Checked here too, so a stale state can never add it to a delivery.
  const credit = details.mode === 'retiro' && details.payment === 'credito'
  const creditSurcharge = credit ? Math.round((products * CREDIT_SURCHARGE_PERCENT) / 100) : null

  return {
    products,
    pizzaSurcharge,
    promoPizzasToConfirm,
    shipping,
    creditSurcharge,
    total: products + (pizzaSurcharge?.amount ?? 0) + (shipping.kind === 'amount' ? shipping.amount : 0) + (creditSurcharge ?? 0),
    complete: shipping.kind !== 'to-confirm' && !promoPizzasToConfirm,
  }
}

export const TO_CONFIRM = 'A confirmar'
export const TOTAL_CONFIRMED_BY_STORE = 'El local confirma el total.'

export interface TotalsRow {
  label: string
  /** Formatted amount, or «A confirmar». */
  value: string
  /** The amount this row adds to the total; `null` when it is still to confirm. */
  amount: Ars | null
}

export interface TotalsSummary {
  rows: TotalsRow[]
  total: { label: string; value: string }
  /** What the total leaves out, then who confirms it. */
  notes: string[]
}

const amountRow = (label: string, amount: Ars): TotalsRow => ({ label, value: formatArs(amount), amount })
const pendingRow = (label: string): TotalsRow => ({ label, value: TO_CONFIRM, amount: null })

/**
 * The rows of the order summary, shared word for word by the summary card and the WhatsApp message, so what the
 * customer sees and what the store receives can never differ.
 */
export function totalsSummary(totals: OrderTotals): TotalsSummary {
  const rows: TotalsRow[] = [amountRow('Productos', totals.products)]
  const excluded: string[] = []
  if (totals.pizzaSurcharge) {
    const { count, unit, amount } = totals.pizzaSurcharge
    rows.push(amountRow(`Recargo por pizza (${count} × ${formatArs(unit)})`, amount))
  }
  if (totals.promoPizzasToConfirm) {
    rows.push(pendingRow('Recargo por pizzas de promos'))
    excluded.push('el recargo por pizzas de promos')
  }
  if (totals.shipping.kind === 'amount') rows.push(amountRow('Envío', totals.shipping.amount))
  if (totals.shipping.kind === 'to-confirm') {
    rows.push(pendingRow('Envío'))
    excluded.unshift('el envío')
  }
  if (totals.creditSurcharge !== null) rows.push(amountRow(`Recargo crédito ${CREDIT_SURCHARGE_PERCENT} %`, totals.creditSurcharge))

  const notes = excluded.length > 0 ? [`No incluye ${excluded.join(' ni ')}: el local ${excluded.length > 1 ? 'los' : 'lo'} confirma.`] : []
  return {
    rows,
    total: { label: totals.complete ? 'Total orientativo' : 'Total parcial', value: formatArs(totals.total) },
    notes: [...notes, TOTAL_CONFIRMED_BY_STORE],
  }
}

/** The WhatsApp text (RF-19), with the same summary rows as the card. Opening WhatsApp with it comes later. */
export function buildOrderMessage(details: CheckoutDetails, order: OrderSummary, totals: OrderTotals): string {
  const zone = zoneOptions.find((option) => option.id === details.zoneId)
  const header = [`*Pedido para ${storeInfo.name}*`, `Nombre: ${details.name.trim()}`]
  if (details.mode) header.push(`Modalidad: ${modeLabels[details.mode]}`)
  if (details.mode === 'envio') {
    header.push(`Dirección: ${details.address.trim()}`)
    if (zone) header.push(`Zona: ${zone.label}`)
  }

  const items = order.lines.flatMap((item) => {
    const row = `• ${item.line.quantity} × ${item.messageLabel}: ${formatArs(item.subtotal)}`
    return item.line.note ? [row, `  Aclaración: ${item.line.note}`] : [row]
  })

  const summary = totalsSummary(totals)
  const rows = summary.rows.map(({ label, value }) => `${label}: ${value}`)

  const info: string[] = []
  if (details.payment) info.push(`Pago: ${paymentLabel(details.payment)}`)
  // One notice per product, even when it appears in several lines (RN-07).
  const madeToOrder = new Map(order.lines.flatMap((item) => item.madeToOrder).map((entry) => [entry.name, entry.notice]))
  for (const [name, notice] of madeToOrder) info.push(`Por encargo: ${name}. ${notice}`)
  if (details.note.trim()) info.push(`Nota: ${details.note.trim()}`)

  const blocks = [header, ['*Productos*', ...items], rows, info, [`*${summary.total.label}: ${summary.total.value}*`, ...summary.notes]]
  return blocks
    .filter((block) => block.length > 0)
    .map((block) => block.join('\n'))
    .join('\n\n')
}
