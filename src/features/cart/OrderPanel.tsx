import { PrimaryAction } from '@/components/ui/PrimaryAction'
import { CartLines, EmptyOrder, ProductsSubtotal } from './CartLines'
import { itemCountLabel, useOrderSummary } from './useOrderSummary'

/** Desktop order panel (≥ 1024 px): the same content as the cart step, always in view next to the menu. */
export function OrderPanel({ onContinue }: { onContinue: () => void }) {
  const summary = useOrderSummary()
  const empty = summary.itemCount === 0

  return (
    <section
      aria-labelledby="panel-pedido-titulo"
      className="sticky top-4 flex max-h-[calc(100dvh-2rem)] flex-col overflow-hidden rounded-2xl bg-chapa-high ring-1 ring-chapa-edge"
    >
      <div className="texture-pino flex items-baseline justify-between gap-3 px-5 py-4 text-pino-ink">
        <h2 id="panel-pedido-titulo" className="type-display text-[1.5rem]">
          Tu pedido
        </h2>
        {empty ? null : <p className="text-[0.875rem] font-bold">{itemCountLabel(summary.itemCount)}</p>}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-5">{empty ? <EmptyOrder /> : <CartLines summary={summary} />}</div>
      {empty ? null : (
        <div className="flex flex-col gap-3 border-t border-chapa-edge p-5">
          <ProductsSubtotal amount={summary.productsSubtotal} />
          <PrimaryAction onClick={onContinue} aria-haspopup="dialog" label="Continuar" />
        </div>
      )}
    </section>
  )
}
