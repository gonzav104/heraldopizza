import { formatArs } from '@/lib/money'
import { useOrderStore } from './order-store'
import { itemCountLabel, useOrderFeedback, useOrderSummary } from './useOrderSummary'

interface CartBarViewProps {
  count: number
  total: number
  onOpen: () => void
  /** Changes on every add: replays the bump and the count pop. */
  bumpKey?: number
  /** Transient line after an add ("Agregaste Muzzarella entera"), shown instead of "Tu pedido". */
  message?: string | null
}

/** The order as a strip of pine counter: count, "Tu pedido", and the running total. The whole bar opens the order. */
export function CartBarView({ count, total, onOpen, bumpKey = 0, message = null }: CartBarViewProps) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-haspopup="dialog"
      aria-label={`Ver tu pedido: ${itemCountLabel(count)}, ${formatArs(total)}`}
      className="texture-pino block w-full min-w-0 rounded-2xl text-pino-ink shadow-[0_-4px_24px_-6px_rgb(0_0_0/0.7),0_14px_28px_-12px_rgb(0_0_0/0.9),inset_0_1px_0_rgb(255_255_255/0.35)] focus-visible:outline-pino-ink"
    >
      <span key={bumpKey} className="flex min-h-15 items-center gap-2.5 px-3 motion-safe:animate-[bar-bump_250ms_var(--ease-out-soft)]">
        <span
          key={count}
          className="type-price grid h-8 min-w-8 shrink-0 place-items-center rounded-full bg-heraldo px-2 text-[1rem] text-white shadow-[0_2px_4px_rgb(58_34_16/0.5)] motion-safe:animate-[count-pop_320ms_var(--ease-out-expo)]"
        >
          {count}
        </span>
        {message ? (
          <span className="line-clamp-2 min-w-0 flex-1 text-left text-[0.875rem] leading-tight font-bold motion-safe:animate-[feedback-in_220ms_var(--ease-out-expo)]">
            {message}
          </span>
        ) : (
          <span className="min-w-0 flex-1 text-left text-[1.0625rem] font-[800] whitespace-nowrap [font-stretch:108%]">Tu pedido</span>
        )}
        <span className="type-price shrink-0 text-[1.1875rem]">{formatArs(total)}</span>
      </span>
    </button>
  )
}

interface OrderBarProps {
  onOpenOrder: () => void
}

/**
 * One-handed order bar on phones: the pine counter strip, present only while the order has items.
 * It is `sticky` as the last thing on the page, not `fixed`: it follows the thumb while the menu scrolls, and at the
 * end of the page it rests below the footer, so it never covers it and an empty order reserves no space.
 * Hidden on desktop, where the side panel holds the order.
 */
export function OrderBar({ onOpenOrder }: OrderBarProps) {
  const summary = useOrderSummary()
  const addedCount = useOrderStore((state) => state.addedCount)
  const feedback = useOrderFeedback()
  if (summary.itemCount === 0) return null

  return (
    <div className="pointer-events-none sticky bottom-0 z-40 bg-linear-to-t from-chapa from-50% to-transparent px-3 pt-6 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden">
      <div className="pointer-events-auto mx-auto max-w-xl">
        <CartBarView
          count={summary.itemCount}
          total={summary.productsSubtotal}
          onOpen={onOpenOrder}
          bumpKey={addedCount}
          message={feedback.visible ? feedback.text : null}
        />
      </div>
    </div>
  )
}

/** Polite announcement after each change: "Agregaste Muzzarella entera. Tu pedido: 3 productos, $ 36.500". */
export function OrderAnnouncer() {
  const summary = useOrderSummary()
  const feedback = useOrderFeedback()
  const order =
    summary.itemCount > 0 ? `Tu pedido: ${itemCountLabel(summary.itemCount)}, ${formatArs(summary.productsSubtotal)}` : 'Tu pedido está vacío'
  const text = feedback.text ? `${feedback.text}. ${order}.` : summary.itemCount > 0 ? `${order}.` : ''

  return (
    <p aria-live="polite" className="sr-only">
      {text}
    </p>
  )
}
