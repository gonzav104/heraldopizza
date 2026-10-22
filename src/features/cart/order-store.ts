import { create } from 'zustand'
import { persist } from 'zustand/middleware'
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
import {
  ORDER_STORAGE_KEY,
  ORDER_STORAGE_VERSION,
  orderStorage,
  resetOrderStorageStatus,
  toPersistedOrder,
  type PersistedOrder,
} from './order-storage'

// The order, saved in this browser so a reload keeps it (RF-17). Only the lines are persisted (see order-storage.ts);
// the feedback counters start over on every load.

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

export const useOrderStore = create<OrderState>()(
  persist<OrderState, [], [], PersistedOrder>(
    (set) => ({
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
    }),
    {
      name: ORDER_STORAGE_KEY,
      version: ORDER_STORAGE_VERSION,
      storage: orderStorage,
      partialize: (state) => toPersistedOrder(state.lines),
      // Saved ids are never trusted: restored lines get fresh ones through the usual add, so they cannot collide with
      // new lines, and duplicates merge the same way they do while ordering.
      merge: (persisted, current) => {
        const saved = (persisted as PersistedOrder | undefined)?.lines ?? []
        return { ...current, lines: saved.reduce<OrderLine[]>((lines, line) => addLine(lines, line, createId), []) }
      },
    },
  ),
)

/** Test helper: empties the order between tests. */
export function resetOrderStore() {
  resetOrderStorageStatus()
  useOrderStore.setState({ lines: [], addedCount: 0, lastChange: null })
}
