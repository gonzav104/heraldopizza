// "Armá tu pizza" (D1–D3): the first half is required, the second optional, and a flavor never repeats.
// One flavor makes a half pizza (Media variant); two make a half-and-half priced as both halves (RN-10).
import type { Ars, Product } from '@/domain/catalog'
import { formatArs } from '@/lib/money'
import type { NewOrderLine } from '@/features/cart/order-lines'
import { halfPrice } from './presentation'

export type Slot = 'first' | 'second'

export interface BuilderState {
  first: string | null
  second: string | null
  /** The slot a tapped flavor goes to. */
  active: Slot
}

export type BuilderMode = 'empty' | 'media' | 'mitad'

export type BuilderPrice = { mode: 'media'; total: Ars } | { mode: 'mitad'; first: Ars; second: Ars; total: Ars }

export const modeLabels: Record<BuilderMode, string> = {
  empty: 'Elegí el primer gusto',
  media: 'Media pizza',
  mitad: 'Mitad y mitad',
}

/** Opens empty on the first slot, or with a preselected first half and the second slot active. */
export function initBuilder(firstId: string | null = null): BuilderState {
  return firstId ? { first: firstId, second: null, active: 'second' } : { first: null, second: null, active: 'first' }
}

/** The second slot is reachable only once the first has a flavor. */
export function selectSlot(state: BuilderState, slot: Slot): BuilderState {
  if (slot === 'second' && !state.first) return state.active === 'first' ? state : { ...state, active: 'first' }
  return state.active === slot ? state : { ...state, active: slot }
}

/** D3: a flavor chosen in the other half cannot be chosen again. */
export function isTakenByOtherSlot(state: BuilderState, productId: string): boolean {
  return (state.active === 'first' ? state.second : state.first) === productId
}

/** Puts the flavor in the active slot, then moves on to the second slot while it is empty. */
export function assignFlavor(state: BuilderState, productId: string): BuilderState {
  if (isTakenByOtherSlot(state, productId)) return state
  const next = { ...state, [state.active]: productId }
  return { ...next, active: next.second ? state.active : 'second' }
}

/** Clearing the first half promotes the second one, so the first half is never empty while the second is set. */
export function clearSlot(state: BuilderState, slot: Slot): BuilderState {
  if (slot === 'second') return { ...state, second: null, active: 'second' }
  if (state.second) return { first: state.second, second: null, active: 'second' }
  return initBuilder()
}

export function builderMode(state: BuilderState): BuilderMode {
  if (!state.first) return 'empty'
  return state.second ? 'mitad' : 'media'
}

export function builderPrice(state: BuilderState, products: Product[]): BuilderPrice | null {
  const priceOf = (id: string | null) => {
    const product = id ? products.find((item) => item.id === id) : undefined
    return product ? halfPrice(product) : null
  }
  const first = priceOf(state.first)
  if (first === null) return null
  if (!state.second) return { mode: 'media', total: first }
  const second = priceOf(state.second)
  return second === null ? null : { mode: 'mitad', first, second, total: first + second }
}

/** The math only ("$ 10.500" or "$ 10.500 + $ 14.500 = $ 25.000"): the mode pill already names the mode. */
export function priceLine(price: BuilderPrice): string {
  if (price.mode === 'media') return formatArs(price.total)
  return `${formatArs(price.first)} + ${formatArs(price.second)} = ${formatArs(price.total)}`
}

/** What screen readers hear: "Mitad y mitad: $ 10.500 + $ 14.500 = $ 25.000". */
export function priceAnnouncement(price: BuilderPrice): string {
  return `${modeLabels[price.mode]}: ${priceLine(price)}`
}

/** The order line for the current choice; halves are stored in catalog order so A+B and B+A merge. */
export function buildPizzaLine(state: BuilderState, products: Product[], quantity: number, note: string): NewOrderLine | null {
  const first = products.find((item) => item.id === state.first)
  if (!first || builderPrice(state, products) === null) return null

  if (!state.second) {
    const media = first.variants.find((variant) => variant.name === 'Media')
    return media ? { kind: 'product', productId: first.id, variantId: media.id, quantity, note } : null
  }

  const second = products.find((item) => item.id === state.second)
  if (!second || second.id === first.id) return null
  const [a, b] = [first, second].sort((x, y) => x.order - y.order || x.id.localeCompare(y.id))
  return { kind: 'half', firstProductId: a.id, secondProductId: b.id, quantity, note }
}
