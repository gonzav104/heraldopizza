// The order's business rules, in one place for the form, the summary card, the message, and «Info» (P3).
// Owner decisions (2026-10-22): food costs the same for pickup and delivery (no per-pizza surcharge); the customer
// pays the motito apart, by destination, so the checkout neither asks for a zone nor computes it (the official rates
// are for reference only, in data/delivery-rates.ts); payments by mode (RN-11); credit adds 8 % on products, pickup
// only (RN-17). Rain and after-midnight extras are notices, never amounts.
import type { Ars } from '@/domain/catalog'
import { storeInfo } from '@/data/store-info'
import { formatArs } from '@/lib/money'
import type { OrderSummary } from '@/features/cart/line-pricing'

export const CREDIT_SURCHARGE_PERCENT = 8

export type FulfillmentMode = 'envio' | 'retiro'
export type PaymentMethod = 'efectivo' | 'transferencia' | 'debito' | 'credito'

export const modeLabels: Record<FulfillmentMode, string> = { envio: 'Envío', retiro: 'Retiro' }

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
  payment: PaymentMethod | null
  note: string
}

export const emptyCheckout: CheckoutDetails = { name: '', mode: null, address: '', payment: null, note: '' }

/** Changing the mode drops a payment the new mode does not accept (e.g. credit when switching to delivery). */
export function withMode(details: CheckoutDetails, mode: FulfillmentMode): CheckoutDetails {
  const allowed = paymentOptions(mode).some((option) => option.id === details.payment)
  return { ...details, mode, payment: allowed ? details.payment : null }
}

export type CheckoutField = 'name' | 'mode' | 'address' | 'payment'
export type CheckoutErrors = Partial<Record<CheckoutField, string>>

/** Field order matters: the form focuses the first invalid field. */
export const checkoutFieldOrder: CheckoutField[] = ['name', 'mode', 'address', 'payment']

export function validateCheckout(details: CheckoutDetails): CheckoutErrors {
  const errors: CheckoutErrors = {}
  // First and last name: at least two words, so the store knows who to ask for.
  if (details.name.trim().split(/\s+/).filter(Boolean).length < 2) errors.name = 'Escribí tu nombre y apellido.'
  if (!details.mode) errors.mode = 'Elegí envío o retiro.'
  // The address only for delivery; never a zone (the motito is paid apart, by destination).
  if (details.mode === 'envio' && !details.address.trim()) errors.address = 'Escribí la dirección para el envío.'
  if (!details.payment) errors.payment = 'Elegí cómo vas a pagar.'
  else if (details.mode && !paymentOptions(details.mode).some((option) => option.id === details.payment)) {
    errors.payment = 'Con envío se paga en efectivo o por transferencia.'
  }
  return errors
}

export interface OrderTotals {
  products: Ars
  creditSurcharge: Ars | null
  /** Delivery: the motito is paid apart and is never part of the total. */
  delivery: boolean
  /** The store's orientative total: products, plus the credit surcharge when it applies. */
  total: Ars
}

export function computeTotals(order: Pick<OrderSummary, 'productsSubtotal'>, details: Pick<CheckoutDetails, 'mode' | 'payment'>): OrderTotals {
  const products = order.productsSubtotal
  // Credit is a pickup payment (RN-11): its 8 % applies to products only (RN-17), in whole pesos rounded to the
  // nearest (RN-02). Checked here too, so a stale state can never add it to a delivery.
  const credit = details.mode === 'retiro' && details.payment === 'credito'
  const creditSurcharge = credit ? Math.round((products * CREDIT_SURCHARGE_PERCENT) / 100) : null
  return { products, creditSurcharge, delivery: details.mode === 'envio', total: products + (creditSurcharge ?? 0) }
}

export const TOTAL_CONFIRMED_BY_STORE = 'El local confirma el total.'
export const MOTITO_PAID_APART = 'No incluye el reparto en motito: se paga aparte, con tarifa según el destino, y lo confirma el local.'

export interface TotalsRow {
  label: string
  /** Formatted amount, or what happens with a cost that is not in the total («Se paga aparte»). */
  value: string
  /** The amount this row adds to the total; `null` when it is not part of it. */
  amount: Ars | null
}

export interface TotalsSummary {
  rows: TotalsRow[]
  total: { label: string; value: string }
  /** What the total leaves out, then who confirms it. */
  notes: string[]
}

const amountRow = (label: string, amount: Ars): TotalsRow => ({ label, value: formatArs(amount), amount })

/**
 * The rows of the order summary, shared word for word by the summary card and the WhatsApp message, so what the
 * customer sees and what the store receives can never differ.
 */
export function totalsSummary(totals: OrderTotals): TotalsSummary {
  const rows: TotalsRow[] = [amountRow('Productos', totals.products)]
  if (totals.creditSurcharge !== null) rows.push(amountRow(`Recargo crédito ${CREDIT_SURCHARGE_PERCENT} %`, totals.creditSurcharge))
  if (totals.delivery) rows.push({ label: 'Reparto en motito', value: 'Se paga aparte', amount: null })
  return {
    rows,
    total: { label: 'Total orientativo', value: formatArs(totals.total) },
    notes: totals.delivery ? [MOTITO_PAID_APART, TOTAL_CONFIRMED_BY_STORE] : [TOTAL_CONFIRMED_BY_STORE],
  }
}

/** The WhatsApp text (RF-19), with the same summary rows as the card. Opening WhatsApp with it comes later. */
export function buildOrderMessage(details: CheckoutDetails, order: OrderSummary, totals: OrderTotals): string {
  const header = [`*Pedido para ${storeInfo.name}*`, `Nombre: ${details.name.trim()}`]
  if (details.mode) header.push(`Modalidad: ${modeLabels[details.mode]}`)
  if (details.mode === 'envio') header.push(`Dirección: ${details.address.trim()}`)

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
