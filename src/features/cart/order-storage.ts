import { create } from 'zustand'
import type { PersistStorage, StorageValue } from 'zustand/middleware'
import { restoreLines, type NewOrderLine, type OrderLine } from './order-lines'

// The order is saved in this browser so a reload keeps it (RF-17). Only the lines are saved: product, variant,
// half-and-half flavors, promotion, quantity, and the item note. Never prices (always resolved from the catalog), line
// ids (rebuilt on load), or the checkout's personal data (remembering it is RF-22, F2).
// This is the only file that touches browser storage; privacy-claims.test.ts keeps it that way.

export const ORDER_STORAGE_KEY = 'heraldo-pedido'
export const ORDER_STORAGE_VERSION = 1

export interface PersistedOrder {
  lines: NewOrderLine[]
}

/** What is saved: the lines without their ids, which are rebuilt on load. */
export function toPersistedOrder(lines: OrderLine[]): PersistedOrder {
  return {
    lines: lines.map((line) => {
      const saved: Partial<OrderLine> = { ...line }
      delete saved.id
      return saved as NewOrderLine
    }),
  }
}

/** Why the saved order could not be fully recovered or saved; shown to the customer, never swallowed. */
export type OrderStorageIssue =
  | { kind: 'partial'; discarded: number }
  | { kind: 'corrupt' }
  | { kind: 'incompatible' }
  | { kind: 'unavailable' }

interface OrderStorageStatus {
  issue: OrderStorageIssue | null
  dismiss: () => void
}

export const useOrderStorageStatus = create<OrderStorageStatus>()((set) => ({
  issue: null,
  dismiss: () => set({ issue: null }),
}))

const report = (issue: OrderStorageIssue) => useOrderStorageStatus.setState({ issue })

/** Set when the saved data could not be read: it is kept until the customer has something new to save. */
let keepUnreadable = false
/** A failing save is reported once per page load, not on every change. */
let saveFailureReported = false

/** The saved order, validated. Anything unexpected becomes an empty order plus the issue that explains it. */
export function readStoredOrder(raw: string): { lines: NewOrderLine[]; issue: OrderStorageIssue | null } {
  let value: unknown
  try {
    value = JSON.parse(raw)
  } catch {
    return { lines: [], issue: { kind: 'corrupt' } }
  }
  const saved = typeof value === 'object' && value !== null ? (value as Partial<StorageValue<unknown>>) : {}
  if (typeof saved.version !== 'number') return { lines: [], issue: { kind: 'corrupt' } }
  if (saved.version !== ORDER_STORAGE_VERSION) return { lines: [], issue: { kind: 'incompatible' } }
  const state = typeof saved.state === 'object' && saved.state !== null ? (saved.state as Record<string, unknown>) : {}
  const restored = restoreLines(state.lines)
  if (!restored) return { lines: [], issue: { kind: 'corrupt' } }
  return { lines: restored.lines, issue: restored.discarded > 0 ? { kind: 'partial', discarded: restored.discarded } : null }
}

/**
 * localStorage behind the persist middleware, without its failure modes: a blocked or full storage, or a bad saved
 * value, never breaks the order. It always answers with the current version, so the middleware never migrates and never
 * writes back while hydrating.
 */
export const orderStorage: PersistStorage<PersistedOrder> = {
  getItem: (name) => {
    let raw: string | null
    try {
      raw = window.localStorage.getItem(name)
    } catch {
      report({ kind: 'unavailable' })
      return null
    }
    if (raw === null) return null
    const { lines, issue } = readStoredOrder(raw)
    if (issue) report(issue)
    keepUnreadable = issue?.kind === 'corrupt' || issue?.kind === 'incompatible'
    return { state: { lines }, version: ORDER_STORAGE_VERSION }
  },
  setItem: (name, value) => {
    if (keepUnreadable && value.state.lines.length === 0) return
    try {
      window.localStorage.setItem(name, JSON.stringify(value))
      keepUnreadable = false
    } catch {
      if (!saveFailureReported) report({ kind: 'unavailable' })
      saveFailureReported = true
    }
  },
  removeItem: (name) => {
    try {
      window.localStorage.removeItem(name)
    } catch {
      // Nothing to remove when the storage cannot be reached.
    }
  },
}

/** Test helper: forgets the issue and the per-load flags. */
export function resetOrderStorageStatus() {
  keepUnreadable = false
  saveFailureReported = false
  useOrderStorageStatus.setState({ issue: null })
}
