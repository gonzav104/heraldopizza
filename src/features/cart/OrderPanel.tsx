import { PrimaryAction } from '@/components/ui/PrimaryAction'
import { CartLines, CheckoutBlockedNote, EmptyOrder, OrderIssues, ProductsSubtotal } from './CartLines'
import { isEmptyOrder, isReadyForCheckout } from './line-pricing'
import { OrderStorageNotice } from './OrderStorageNotice'
import { itemCountLabel, useOrderSummary } from './useOrderSummary'

/** Desktop order panel (≥ 1024 px): the same content as the cart step, always in view next to the menu. */
export function OrderPanel({ onContinue }: { onContinue: () => void }) {
  const summary = useOrderSummary()
  const empty = isEmptyOrder(summary)

  return (
    <section
      aria-labelledby="panel-pedido-titulo"
      className="sticky top-4 flex max-h-[calc(100dvh-2rem)] flex-col overflow-hidden rounded-2xl bg-chapa-high ring-1 ring-chapa-edge"
    >
      <div className="texture-pino flex items-baseline justify-between gap-3 px-5 py-4 text-pino-ink">
        <h2 id="panel-pedido-titulo" className="type-display text-[1.5rem]">
          Tu pedido
        </h2>
        {summary.itemCount === 0 ? null : <p className="text-[0.875rem] font-bold">{itemCountLabel(summary.itemCount)}</p>}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-5">
        <OrderStorageNotice placement="cart" />
        {empty ? <EmptyOrder /> : null}
        <OrderIssues issues={summary.issues} />
        <CartLines summary={summary} />
      </div>
      {empty ? null : (
        <div className="flex flex-col gap-3 border-t border-chapa-edge p-5">
          <ProductsSubtotal amount={summary.productsSubtotal} />
          {summary.issues.length > 0 ? <CheckoutBlockedNote /> : null}
          <PrimaryAction onClick={onContinue} disabled={!isReadyForCheckout(summary)} aria-haspopup="dialog" label="Continuar" />
        </div>
      )}
    </section>
  )
}
