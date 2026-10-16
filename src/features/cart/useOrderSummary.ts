import { useEffect, useMemo, useState } from 'react'
import { useCatalog } from '@/features/catalog/catalog-context'
import { resolveLine, summarizeOrder, type OrderSummary } from './line-pricing'
import { quantityOf } from './order-lines'
import { useOrderStore } from './order-store'

/** The order priced against the current catalog. */
export function useOrderSummary(): OrderSummary {
  const lines = useOrderStore((state) => state.lines)
  const { index } = useCatalog()
  return useMemo(() => summarizeOrder(lines, index), [lines, index])
}

/** Units of one variant in the order, for the price pill badge. */
export function useVariantQuantity(productId: string, variantId: string): number {
  return useOrderStore((state) => quantityOf(state.lines, productId, variantId))
}

/** The note-less line of a variant, which the empanada steppers control. */
export function usePlainLine(productId: string, variantId: string) {
  return useOrderStore((state) =>
    state.lines.find(
      (line) => line.kind === 'product' && line.productId === productId && line.variantId === variantId && line.note === '',
    ),
  )
}

export function itemCountLabel(count: number): string {
  return `${count} ${count === 1 ? 'producto' : 'productos'}`
}

const FEEDBACK_MS = 1400

/**
 * Wording for the last add or removal: "Agregaste Muzzarella entera", "Quitaste media pizza de Muzzarella".
 * `visible` stays true for about 1.4 s after an add, for the transient line in the bottom bar.
 */
export function useOrderFeedback(): { text: string | null; visible: boolean } {
  const lastChange = useOrderStore((state) => state.lastChange)
  const { index } = useCatalog()
  const [expiredSeq, setExpiredSeq] = useState(0)

  useEffect(() => {
    if (!lastChange) return
    const timer = window.setTimeout(() => setExpiredSeq(lastChange.seq), FEEDBACK_MS)
    return () => window.clearTimeout(timer)
  }, [lastChange])

  const label = lastChange ? resolveLine(lastChange.line, index)?.shortLabel : undefined
  if (!lastChange || !label) return { text: null, visible: false }
  const text = `${lastChange.kind === 'added' ? 'Agregaste' : 'Quitaste'} ${label}`
  return { text, visible: lastChange.kind === 'added' && lastChange.seq !== expiredSeq }
}
