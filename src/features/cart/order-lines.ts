// Order lines and the pure operations on them. Prices are never stored here:
// they are resolved from the catalog at render time (see line-pricing.ts).

export interface ProductOrderLine {
  id: string
  kind: 'product'
  productId: string
  variantId: string
  quantity: number
  note: string
}

/** Half-and-half pizza (RF-56): one pizza made of two half flavors. */
export interface HalfOrderLine {
  id: string
  kind: 'half'
  firstProductId: string
  secondProductId: string
  quantity: number
  note: string
}

/** Closed combo added as a single line (RF-12). */
export interface PromotionOrderLine {
  id: string
  kind: 'promotion'
  promotionId: string
  quantity: number
  note: string
}

export type OrderLine = ProductOrderLine | HalfOrderLine | PromotionOrderLine

export type NewOrderLine = Omit<ProductOrderLine, 'id'> | Omit<HalfOrderLine, 'id'> | Omit<PromotionOrderLine, 'id'>

/** RF-14: short per-item note. */
export const NOTE_MAX_LENGTH = 120

export function normalizeNote(note: string): string {
  return note.trim().slice(0, NOTE_MAX_LENGTH)
}

/** Same item and same note: adding it again merges quantities instead of creating a new line. */
function isSameItem(line: OrderLine, input: NewOrderLine): boolean {
  if (line.note !== normalizeNote(input.note)) return false
  switch (input.kind) {
    case 'product':
      return line.kind === 'product' && line.productId === input.productId && line.variantId === input.variantId
    case 'half':
      // The same two flavors are the same pizza whichever half was picked first.
      return (
        line.kind === 'half' &&
        ((line.firstProductId === input.firstProductId && line.secondProductId === input.secondProductId) ||
          (line.firstProductId === input.secondProductId && line.secondProductId === input.firstProductId))
      )
    case 'promotion':
      return line.kind === 'promotion' && line.promotionId === input.promotionId
  }
}

/** D3: a half-and-half never repeats a flavor. */
export function isValidNewLine(input: NewOrderLine): boolean {
  if (input.quantity <= 0) return false
  return input.kind !== 'half' || input.firstProductId !== input.secondProductId
}

const isId = (value: unknown): value is string => typeof value === 'string' && value !== ''

/** One saved line, checked field by field; `null` when it is not a line the order could have created. */
function restoreLine(value: unknown): NewOrderLine | null {
  if (typeof value !== 'object' || value === null) return null
  const item = value as Record<string, unknown>
  if (typeof item.quantity !== 'number' || !Number.isSafeInteger(item.quantity) || typeof item.note !== 'string') return null
  const common = { quantity: item.quantity, note: normalizeNote(item.note) }
  let line: NewOrderLine | null = null
  if (item.kind === 'product' && isId(item.productId) && isId(item.variantId)) {
    line = { kind: 'product', productId: item.productId, variantId: item.variantId, ...common }
  } else if (item.kind === 'half' && isId(item.firstProductId) && isId(item.secondProductId)) {
    line = { kind: 'half', firstProductId: item.firstProductId, secondProductId: item.secondProductId, ...common }
  } else if (item.kind === 'promotion' && isId(item.promotionId)) {
    line = { kind: 'promotion', promotionId: item.promotionId, ...common }
  }
  return line && isValidNewLine(line) ? line : null
}

/**
 * Lines read back from storage (RF-17). Saved data is untrusted: each line is rebuilt from its known fields, and the
 * ones that do not pass are counted, so the customer can be told. `null` when the value is not a list at all.
 * Whether the products still exist in the current catalog is not checked here.
 */
export function restoreLines(value: unknown): { lines: NewOrderLine[]; discarded: number } | null {
  if (!Array.isArray(value)) return null
  const lines = value.map(restoreLine).filter((line) => line !== null)
  return { lines, discarded: value.length - lines.length }
}

export function addLine(lines: OrderLine[], input: NewOrderLine, createId: () => string): OrderLine[] {
  if (!isValidNewLine(input)) return lines
  const existing = lines.find((line) => isSameItem(line, input))
  if (existing) {
    return lines.map((line) => (line === existing ? { ...line, quantity: line.quantity + input.quantity } : line))
  }
  return [...lines, { ...input, note: normalizeNote(input.note), id: createId() }]
}

export function setLineQuantity(lines: OrderLine[], id: string, quantity: number): OrderLine[] {
  if (quantity <= 0) return removeLine(lines, id)
  return lines.map((line) => (line.id === id ? { ...line, quantity } : line))
}

export function changeQuantity(lines: OrderLine[], id: string, delta: number): OrderLine[] {
  const line = lines.find((item) => item.id === id)
  return line ? setLineQuantity(lines, id, line.quantity + delta) : lines
}

export function removeLine(lines: OrderLine[], id: string): OrderLine[] {
  return lines.filter((line) => line.id !== id)
}

export function setLineNote(lines: OrderLine[], id: string, note: string): OrderLine[] {
  return lines.map((line) => (line.id === id ? { ...line, note: normalizeNote(note) } : line))
}

/** Units of one product variant in the order, across lines with different notes (price pill badge). */
export function quantityOf(lines: OrderLine[], productId: string, variantId: string): number {
  return lines.reduce(
    (total, line) =>
      line.kind === 'product' && line.productId === productId && line.variantId === variantId ? total + line.quantity : total,
    0,
  )
}
