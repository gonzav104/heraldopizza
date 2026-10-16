import { ChevronLeft } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { PrimaryAction } from '@/components/ui/PrimaryAction'
import { Sheet } from '@/components/ui/Sheet'
import { useCheckoutStore, hasTypedText } from '@/features/checkout/checkout-store'
import { CHECKOUT_FORM_ID, CheckoutForm } from '@/features/checkout/CheckoutForm'
import { DisabledSendButton, MessagePreview } from '@/features/checkout/MessagePreview'
import { buildOrderMessage, computeTotals } from '@/features/checkout/prototype-order'
import { formatArs } from '@/lib/money'
import { CartLines, EmptyOrder, ProductsSubtotal } from './CartLines'
import { useOrderSummary } from './useOrderSummary'

export type OrderStep = 'cart' | 'details' | 'preview'

const steps: Record<OrderStep, { title: string; number: number }> = {
  cart: { title: 'Tu pedido', number: 1 },
  details: { title: 'Tus datos', number: 2 },
  preview: { title: 'Revisá el mensaje', number: 3 },
}

interface OrderSheetProps {
  /** Step requested by the opener, or `null` when closed. */
  step: OrderStep | null
  onClose: () => void
}

/**
 * "Tu pedido": cart, order details, and message preview as steps of one sheet, never stacked (NN/g).
 * Its header is the pine counter where the order lives.
 */
export function OrderSheet({ step, onClose }: OrderSheetProps) {
  const summary = useOrderSummary()
  const details = useCheckoutStore((state) => state.details)
  const [current, setCurrent] = useState<OrderStep>(step ?? 'cart')
  const [requested, setRequested] = useState(step)
  const title = useRef<HTMLHeadingElement>(null)

  // A new opening starts at the step the opener asked for.
  if (step !== requested) {
    setRequested(step)
    if (step) setCurrent(step)
  }

  const shownStep: OrderStep = summary.itemCount === 0 ? 'cart' : current
  const totals = computeTotals(summary, details)

  // Moving between steps puts focus on the new step's heading, so screen readers hear where they are.
  useEffect(() => {
    if (step) title.current?.focus({ preventScroll: true })
  }, [shownStep, step])

  const back = () => setCurrent(shownStep === 'preview' ? 'details' : 'cart')

  const footer =
    shownStep === 'cart' ? (
      summary.itemCount > 0 ? (
        <div className="flex flex-col gap-3">
          <ProductsSubtotal amount={summary.productsSubtotal} />
          <PrimaryAction onClick={() => setCurrent('details')} label="Continuar" />
        </div>
      ) : (
        <PrimaryAction onClick={onClose} label="Ver la carta" />
      )
    ) : shownStep === 'details' ? (
      <PrimaryAction type="submit" form={CHECKOUT_FORM_ID} label="Ver mensaje" amount={formatArs(totals.total)} />
    ) : (
      <DisabledSendButton />
    )

  return (
    <Sheet
      open={step !== null}
      onClose={onClose}
      labelledBy="pedido-titulo"
      headerTone="pino"
      dismissOnBackdrop={shownStep !== 'details' || !hasTypedText(details)}
      footer={footer}
      header={
        <>
          {shownStep !== 'cart' ? (
            <button
              type="button"
              onClick={back}
              aria-label="Volver al paso anterior"
              className="-ml-2 grid size-11 shrink-0 place-items-center rounded-full text-pino-ink transition-colors hover:bg-pino-ink/10 focus-visible:outline-pino-ink"
            >
              <ChevronLeft aria-hidden="true" className="size-6" strokeWidth={2.5} />
            </button>
          ) : null}
          <div className="min-w-0">
            <h2
              id="pedido-titulo"
              ref={title}
              tabIndex={-1}
              className="type-display text-[1.5rem] leading-none focus-visible:outline-pino-ink"
            >
              {steps[shownStep].title}
            </h2>
            <p className="mt-1 text-[0.8125rem] font-semibold">Paso {steps[shownStep].number} de 3</p>
          </div>
        </>
      }
    >
      {shownStep === 'cart' ? (
        <div className="px-5 sm:px-6">{summary.itemCount > 0 ? <CartLines summary={summary} /> : <EmptyOrder />}</div>
      ) : null}
      {shownStep === 'details' ? <CheckoutForm totals={totals} onValid={() => setCurrent('preview')} /> : null}
      {shownStep === 'preview' ? <MessagePreview message={buildOrderMessage(details, summary, totals)} /> : null}
    </Sheet>
  )
}
