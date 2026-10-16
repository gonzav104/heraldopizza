// PROTOTYPE for U2: U7 (pricing) and U8 (message) replace these with the final tested versions.
// Business facts come from docs/requerimientos.pdf: RN-11 (payments), RN-15 / RF-62 (per-pizza surcharge),
// RN-17 (credit surcharge), RF-63 (zones; the real list is still missing, so only "Otra zona" exists).
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
}

export const OTHER_ZONE: ZoneOption = { id: 'otra-zona', label: 'Otra zona (a consultar)', pinned: true }

/** U8 adds the barrios and fábricas (RF-63) before the pinned last option. Never invent them. */
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

export interface OrderTotals {
  products: Ars
  pizzaSurcharge: { count: number; unit: Ars; amount: Ars } | null
  /** "Otra zona": the shipping cost is not known and stays out of the total (RF-63). */
  shippingToConfirm: boolean
  creditSurcharge: Ars | null
  total: Ars
}

export function computeTotals(
  order: Pick<OrderSummary, 'productsSubtotal' | 'pizzaCount'>,
  details: Pick<CheckoutDetails, 'mode' | 'payment'>,
): OrderTotals {
  const products = order.productsSubtotal
  const delivery = details.mode === 'envio'
  const pizzaSurcharge =
    delivery && order.pizzaCount > 0
      ? { count: order.pizzaCount, unit: DELIVERY_SURCHARGE_PER_PIZZA, amount: order.pizzaCount * DELIVERY_SURCHARGE_PER_PIZZA }
      : null
  // The credit surcharge applies to products only, never to delivery charges (RN-17). Whole pesos (RN-02).
  const creditSurcharge = details.payment === 'credito' ? Math.round((products * CREDIT_SURCHARGE_PERCENT) / 100) : null

  return {
    products,
    pizzaSurcharge,
    shippingToConfirm: delivery,
    creditSurcharge,
    total: products + (pizzaSurcharge?.amount ?? 0) + (creditSurcharge ?? 0),
  }
}

/** The WhatsApp text (RF-19). U8 finalizes and URL-encodes it; U2 only previews it. */
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

  const extras: string[] = []
  if (totals.pizzaSurcharge) {
    const { count, unit, amount } = totals.pizzaSurcharge
    extras.push(`Recargo por pizza (${count} × ${formatArs(unit)}): ${formatArs(amount)}`)
  }
  if (totals.shippingToConfirm) extras.push('Envío: a confirmar')
  if (totals.creditSurcharge !== null) {
    extras.push(`Recargo crédito ${CREDIT_SURCHARGE_PERCENT} %: ${formatArs(totals.creditSurcharge)}`)
  }
  if (details.payment) extras.push(`Pago: ${paymentLabel(details.payment)}`)
  // One notice per product, even when it appears in several lines (RN-07).
  const madeToOrder = new Map(order.lines.flatMap((item) => item.madeToOrder).map((entry) => [entry.name, entry.notice]))
  for (const [name, notice] of madeToOrder) extras.push(`Por encargo: ${name}. ${notice}`)
  if (details.note.trim()) extras.push(`Nota: ${details.note.trim()}`)

  const blocks = [header, ['*Productos*', ...items], extras, [`*Total orientativo: ${formatArs(totals.total)}*`, 'El local confirma el total.']]
  return blocks
    .filter((block) => block.length > 0)
    .map((block) => block.join('\n'))
    .join('\n\n')
}
