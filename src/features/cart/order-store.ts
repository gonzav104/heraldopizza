import { create } from 'zustand'
import {
  addLine,
  isValidNewLine,
  changeQuantity,
  removeLine,
  setLineNote,
  setLineQuantity,
  type NewOrderLine,
  type OrderLine,
} from './order-lines'

// Prototype order state for U2: in memory only. U5 adds `persist` so the order survives a reload (RF-15).

/**
 * The last add or removal, for the visible and spoken feedback ("Agregaste…", "Quitaste…").
 * Other changes (a decrement that keeps the line, a note) reset it to `null`.
 */
export interface OrderChange {
  kind: 'added' | 'removed'
  /** Snapshot of the line, so a removed line can still be named. */
  line: OrderLine
  seq: number
}

interface OrderState {
  lines: OrderLine[]
  /** Grows on every add; the cart bar keys its feedback animation on it. */
  addedCount: number
  lastChange: OrderChange | null
  add: (input: NewOrderLine) => void
  increment: (id: string) => void
  decrement: (id: string) => void
  remove: (id: string) => void
  setNote: (id: string, note: string) => void
  setQuantity: (id: string, quantity: number) => void
  clear: () => void
}

let lastId = 0
const createId = () => `linea-${++lastId}`

let lastSeq = 0

function change(kind: OrderChange['kind'], line: OrderLine): OrderChange {
  return { kind, line, seq: ++lastSeq }
}

/** The change caused by going from `before` to `after` for one line id: removed when it disappeared. */
function removalOf(before: OrderLine[], after: OrderLine[], id: string): OrderChange | undefined {
  const line = before.find((item) => item.id === id)
  return line && !after.some((item) => item.id === id) ? change('removed', line) : undefined
}

export const useOrderStore = create<OrderState>()((set) => ({
  lines: [],
  addedCount: 0,
  lastChange: null,
  add: (input) =>
    set((state) => {
      if (!isValidNewLine(input)) return state
      const lines = addLine(state.lines, input, createId)
      const line = lines.find((item) => !state.lines.includes(item)) ?? lines[lines.length - 1]
      return { lines, addedCount: state.addedCount + 1, lastChange: change('added', line) }
    }),
  increment: (id) =>
    set((state) => {
      const lines = changeQuantity(state.lines, id, 1)
      const line = lines.find((item) => item.id === id)
      return line ? { lines, addedCount: state.addedCount + 1, lastChange: change('added', line) } : state
    }),
  decrement: (id) =>
    set((state) => {
      const lines = changeQuantity(state.lines, id, -1)
      return { lines, lastChange: removalOf(state.lines, lines, id) ?? null }
    }),
  remove: (id) =>
    set((state) => {
      const lines = removeLine(state.lines, id)
      return { lines, lastChange: removalOf(state.lines, lines, id) ?? null }
    }),
  setNote: (id, note) => set((state) => ({ lines: setLineNote(state.lines, id, note), lastChange: null })),
  setQuantity: (id, quantity) =>
    set((state) => {
      const lines = setLineQuantity(state.lines, id, quantity)
      return { lines, lastChange: removalOf(state.lines, lines, id) ?? null }
    }),
  clear: () => set({ lines: [], lastChange: null }),
}))

/** Test helper: empties the order between tests. */
export function resetOrderStore() {
  useOrderStore.setState({ lines: [], addedCount: 0, lastChange: null })
}
