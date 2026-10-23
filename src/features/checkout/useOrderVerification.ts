import { useCallback, useEffect, useRef, useState } from 'react'
import { useRefreshCatalog } from '@/features/catalog/catalog-refresh'
import { indexCatalog, reconcileOrder } from '@/features/cart/line-pricing'
import { msUntilArgentinaMidnight } from '@/lib/argentina-time'
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
  // What the customer saw before a price change they have not accepted yet. A new check compares against it, so an
  // expired, failed, or timed-out change still has to be accepted if the new price holds (Codex P2 on PR #31). It is
  // dropped once a check verifies with nothing to accept, or once the cart is no longer the same.
  const pending = useRef<OrderSnapshot | null>(null)
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
        if (comparison.priceChanges.length > 0 || comparison.totalAfter !== comparison.totalBefore) {
          pending.current = seen
          setVerification({ status: 'changed', at, seen, fresh, comparison })
        } else {
          pending.current = null
          setVerification({ status: 'verified', at, snapshot: fresh })
        }
      } catch {
        if (request !== latest.current) return
        controller.current = null
        clearDeadline()
        setVerification({ status: 'failed', reason: 'network' })
      }
    },
    [refresh, stop],
  )

  /** What a new check compares against: the unaccepted change's starting point for this cart, or the order as it is. */
  const baseFor = (live: OrderSnapshot) => {
    if (pending.current && pending.current.cart !== live.cart) pending.current = null
    return pending.current ?? live
  }

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
        const comparison = compareOrders(seen, live)
        // Back to what the customer had accepted (e.g. credit, then cash again): nothing is left to accept.
        if (comparison.priceChanges.length === 0 && comparison.totalAfter === comparison.totalBefore) {
          pending.current = null
          setVerification({ status: 'verified', at, snapshot: live })
          return
        }
        setVerification({ status: 'changed', at, seen, fresh: live, comparison })
        return
      }
      if (
        verification.status === 'verified' &&
        verification.snapshot.cart === live.cart &&
        isVerificationCurrent(new Date(verification.at), new Date())
      ) {
        const { at, snapshot } = verification
        if (snapshot.total === live.total) {
          setVerification({ status: 'verified', at, snapshot: live })
          return
        }
        // A total changed by the checkout data (e.g. credit) keeps the accepted order as its starting point, like a
        // check does, so it still has to be accepted after an expiry and a new check.
        pending.current = snapshot
        setVerification({ status: 'changed', at, seen: snapshot, fresh: live, comparison: compareOrders(snapshot, live) })
        return
      }
      void check(baseFor(live))
    },
    [verification, check],
  )

  /**
   * A new check from the step's own buttons («Reintentar», «Volver a verificar», a stale WhatsApp tap): it compares
   * against what the customer saw before an unaccepted change, if there is one for this cart.
   */
  const recheck = useCallback((live: OrderSnapshot) => void check(baseFor(live)), [check])

  /** Never turns an expired change into «verified», not even for one render: the time is checked right here. */
  const accept = useCallback(() => {
    if (verification.status !== 'changed') return
    if (!isVerificationCurrent(new Date(verification.at), new Date())) {
      setVerification({ status: 'expired' })
      return
    }
    pending.current = null
    setVerification({ status: 'verified', at: verification.at, snapshot: verification.fresh })
  }, [verification])

  /** Leaving the message step aborts a check in flight; a finished one stays for reuse. */
  const leave = useCallback(() => {
    if (verification.status !== 'checking') return
    stop()
    setVerification({ status: 'unverified', cartChanged: false })
  }, [verification.status, stop])

  // A verified order and a change waiting for acceptance both expire on their own: after 10 minutes, or at midnight in
  // Argentina if that comes first. Accepting and using the link also check the time themselves.
  useEffect(() => {
    if (verification.status !== 'verified' && verification.status !== 'changed') return
    const now = Date.now()
    const timer = window.setTimeout(
      () => setVerification((current) => (current === verification ? { status: 'expired' } : current)),
      Math.max(0, Math.min(verification.at + VERIFICATION_TTL_MS - now, msUntilArgentinaMidnight(new Date(now)))),
    )
    return () => window.clearTimeout(timer)
  }, [verification])

  useEffect(() => stop, [stop])

  return { verification, enter, check, recheck, accept, leave }
}
