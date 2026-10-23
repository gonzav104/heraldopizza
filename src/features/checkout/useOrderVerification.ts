import { useCallback, useEffect, useRef, useState } from 'react'
import { useRefreshCatalog } from '@/features/catalog/catalog-refresh'
import { indexCatalog, reconcileOrder } from '@/features/cart/line-pricing'
import { useOrderStore } from '@/features/cart/order-store'
import { useCheckoutStore } from './checkout-store'
import {
  VERIFICATION_TTL_MS,
  cartKey,
  compareOrders,
  isVerificationCurrent,
  snapshotOf,
  type OrderComparison,
  type OrderSnapshot,
} from './order-verification'

/**
 * Where the final check before WhatsApp stands (P6a). «expired» and «unverified» both need a new check; «invalid»
 * sends the sheet back to the cart (P2 shows why); «changed» waits for the customer to accept the new total.
 */
export type Verification =
  | { status: 'unverified'; cartChanged: boolean }
  | { status: 'checking' }
  | { status: 'verified'; at: number; snapshot: OrderSnapshot }
  | { status: 'changed'; at: number; seen: OrderSnapshot; fresh: OrderSnapshot; comparison: OrderComparison }
  | { status: 'invalid' }
  /** «network»: the request failed. «timeout»: it took longer than VERIFICATION_TIMEOUT_MS. Both offer «Reintentar». */
  | { status: 'failed'; reason: 'network' | 'timeout' }
  | { status: 'expired' }

const cancelled = () => new DOMException('The order check was cancelled', 'AbortError')
const timedOut = () => new DOMException('The order check took too long', 'TimeoutError')

/** The final check never waits longer than this: it then fails in a recoverable way («Reintentar»). */
export const VERIFICATION_TIMEOUT_MS = 20_000

/**
 * The final check (P6a-3). It runs on demand, from event handlers, never from a render: one catalog refresh (the two
 * GETs), then the order as the stores hold it at that moment, reconciled by P2 against exactly the catalog the menu
 * now shows. Every check has a number and its own AbortController: starting another one or leaving the step aborts
 * it, and an answer for an older number is dropped. A check started for one cart never authorizes another.
 */
export function useOrderVerification() {
  const refresh = useRefreshCatalog()
  const [verification, setVerification] = useState<Verification>({ status: 'unverified', cartChanged: false })
  const latest = useRef(0)
  const controller = useRef<AbortController | null>(null)
  const deadline = useRef<number | null>(null)

  const clearDeadline = () => {
    if (deadline.current !== null) window.clearTimeout(deadline.current)
    deadline.current = null
  }

  /** Cancels the check in flight, if any: its number goes stale, its request is aborted, and its time limit cleared. */
  const stop = useCallback(() => {
    latest.current++
    controller.current?.abort(cancelled())
    controller.current = null
    clearDeadline()
  }, [])

  const check = useCallback(
    async (seen: OrderSnapshot) => {
      stop()
      const request = latest.current
      const own = new AbortController()
      controller.current = own
      setVerification({ status: 'checking' })
      // The time limit holds even if the request ignores the abort: when it fires, this check's number goes stale, so
      // whatever the request answers later is dropped, and the step fails in a recoverable way.
      deadline.current = window.setTimeout(() => {
        if (request !== latest.current) return
        latest.current++
        own.abort(timedOut())
        controller.current = null
        deadline.current = null
        setVerification({ status: 'failed', reason: 'timeout' })
      }, VERIFICATION_TIMEOUT_MS)
      try {
        const outcome = await refresh(own.signal)
        if (request !== latest.current) return
        controller.current = null
        clearDeadline()
        if (!outcome.applied) {
          setVerification({ status: 'unverified', cartChanged: false })
          return
        }
        const lines = useOrderStore.getState().lines
        const details = useCheckoutStore.getState().details
        if (cartKey(lines) !== seen.cart) {
          setVerification({ status: 'unverified', cartChanged: true })
          return
        }
        const { categories, products, promotions } = outcome.catalog
        const fresh = snapshotOf(lines, reconcileOrder(lines, indexCatalog(categories, products, promotions)), details)
        if (!fresh) {
          setVerification({ status: 'invalid' })
          return
        }
        const comparison = compareOrders(seen, fresh)
        const at = Date.now()
        setVerification(
          comparison.priceChanges.length > 0 || comparison.totalAfter !== comparison.totalBefore
            ? { status: 'changed', at, seen, fresh, comparison }
            : { status: 'verified', at, snapshot: fresh },
        )
      } catch {
        if (request !== latest.current) return
        controller.current = null
        clearDeadline()
        setVerification({ status: 'failed', reason: 'network' })
      }
    },
    [refresh, stop],
  )

  /**
   * Opening the message step. A check that is still current (under 10 minutes, same day in Argentina) for the same
   * cart is reused: only the checkout data changed, so the message is rebuilt, and a different total is accepted again.
   * A change still waiting for acceptance stays waiting: the menu already shows the new prices, so checking again
   * would find nothing to compare and skip the acceptance. Anything else checks with a fresh catalog.
   */
  const enter = useCallback(
    (live: OrderSnapshot) => {
      if (
        verification.status === 'changed' &&
        verification.fresh.cart === live.cart &&
        isVerificationCurrent(new Date(verification.at), new Date())
      ) {
        const { at, seen } = verification
        setVerification({ status: 'changed', at, seen, fresh: live, comparison: compareOrders(seen, live) })
        return
      }
      if (
        verification.status === 'verified' &&
        verification.snapshot.cart === live.cart &&
        isVerificationCurrent(new Date(verification.at), new Date())
      ) {
        const { at, snapshot } = verification
        setVerification(
          snapshot.total === live.total
            ? { status: 'verified', at, snapshot: live }
            : { status: 'changed', at, seen: snapshot, fresh: live, comparison: compareOrders(snapshot, live) },
        )
        return
      }
      // An expired change that was never accepted is checked against what the customer last saw, so it is shown again.
      void check(verification.status === 'changed' && verification.seen.cart === live.cart ? verification.seen : live)
    },
    [verification, check],
  )

  const accept = useCallback(() => {
    setVerification((current) =>
      current.status === 'changed' ? { status: 'verified', at: current.at, snapshot: current.fresh } : current,
    )
  }, [])

  /** Leaving the message step aborts a check in flight; a finished one stays for reuse. */
  const leave = useCallback(() => {
    if (verification.status !== 'checking') return
    stop()
    setVerification({ status: 'unverified', cartChanged: false })
  }, [verification.status, stop])

  // A verified order expires on its own after 10 minutes. Past midnight in Argentina it is caught when it is used.
  useEffect(() => {
    if (verification.status !== 'verified') return
    const timer = window.setTimeout(
      () => setVerification((current) => (current === verification ? { status: 'expired' } : current)),
      Math.max(0, verification.at + VERIFICATION_TTL_MS - Date.now()),
    )
    return () => window.clearTimeout(timer)
  }, [verification])

  useEffect(() => stop, [stop])

  return { verification, enter, check, accept, leave }
}
