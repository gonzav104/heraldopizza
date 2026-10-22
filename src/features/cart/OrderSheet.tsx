import { ChevronLeft } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { PrimaryAction } from '@/components/ui/PrimaryAction'
import { Sheet } from '@/components/ui/Sheet'
import { useCheckoutStore, hasTypedText } from '@/features/checkout/checkout-store'
import { CHECKOUT_FORM_ID, CheckoutForm } from '@/features/checkout/CheckoutForm'
import { DeliveryRatesView } from '@/features/checkout/DeliveryRatesView'
import { MessagePreview, WhatsAppAction } from '@/features/checkout/MessagePreview'
import { buildOrderMessage, computeTotals } from '@/features/checkout/prototype-order'
import { snapshotOf } from '@/features/checkout/order-verification'
import { useOrderVerification } from '@/features/checkout/useOrderVerification'
import { isWhatsAppEnabled } from '@/features/checkout/whatsapp'
import { VerificationPanel } from '@/features/checkout/VerificationPanel'
import { formatArs } from '@/lib/money'
import { CartLines, CheckoutBlockedNote, EmptyOrder, OrderIssues, ProductsSubtotal } from './CartLines'
import { isEmptyOrder, isReadyForCheckout } from './line-pricing'
import { useOrderStore } from './order-store'
import { OrderStorageNotice } from './OrderStorageNotice'
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
  const lines = useOrderStore((state) => state.lines)
  const { verification, enter, check, accept, leave } = useOrderVerification()
  const [current, setCurrent] = useState<OrderStep>(step ?? 'cart')
  const [requested, setRequested] = useState(step)
  // «Tarifas de la motito» opens as a view of the details step, not as a second sheet (sheets never stack).
  const [ratesOpen, setRatesOpen] = useState(false)
  const title = useRef<HTMLHeadingElement>(null)

  // A new opening starts at the step the opener asked for.
  if (step !== requested) {
    setRequested(step)
    setRatesOpen(false)
    if (step) setCurrent(step)
  }

  const empty = isEmptyOrder(summary)
  const ready = isReadyForCheckout(summary)
  // P2: the details and the message exist only for an order with nothing to review, whatever step was requested. The
  // requested step is dropped too, so removing the last issue never skips «Continuar».
  if (!ready && current !== 'cart') setCurrent('cart')
  // Going back to the cart also closes the motito rates, so a later «Continuar» opens the data form (P6a).
  if (!ready && ratesOpen) setRatesOpen(false)
  const shownStep: OrderStep = ready ? current : 'cart'
  const showingRates = ratesOpen && shownStep === 'details'
  const totals = computeTotals(summary, details)
  // The order as the customer sees it now; the message step opens on it only once it is verified (P6a).
  const live = ready ? snapshotOf(lines, summary, details) : null
  const verified =
    verification.status === 'verified' &&
    live !== null &&
    verification.snapshot.cart === live.cart &&
    verification.snapshot.checkout === live.checkout

  // Moving between steps puts focus on the new step's heading, so screen readers hear where they are.
  useEffect(() => {
    if (step) title.current?.focus({ preventScroll: true })
  }, [shownStep, step, showingRates])

  const back = () => {
    if (showingRates) return setRatesOpen(false)
    if (shownStep === 'preview') leave()
    setCurrent(shownStep === 'preview' ? 'details' : 'cart')
  }
  // Closing the sheet aborts a check in flight, like going back.
  const close = () => {
    leave()
    onClose()
  }
  const openMessage = () => {
    if (!live) return
    setCurrent('preview')
    // A tap while a check is running starts nothing new.
    if (verification.status !== 'checking') enter(live)
  }

  const footer =
    shownStep === 'cart' ? (
      !empty ? (
        <div className="flex flex-col gap-3">
          <ProductsSubtotal amount={summary.productsSubtotal} />
          {summary.issues.length > 0 ? <CheckoutBlockedNote /> : null}
          <PrimaryAction onClick={() => setCurrent('details')} disabled={!ready} label="Continuar" />
        </div>
      ) : (
        <PrimaryAction onClick={close} label="Ver la carta" />
      )
    ) : showingRates ? (
      // Distinct keys: React must not turn the pressed «Volver» into the submit button while the click is still being
      // handled, or the browser would submit the form right after it.
      <PrimaryAction key="volver-datos" onClick={() => setRatesOpen(false)} label="Volver a tus datos" />
    ) : shownStep === 'details' ? (
      <PrimaryAction key="ver-mensaje" type="submit" form={CHECKOUT_FORM_ID} label="Ver mensaje" amount={formatArs(totals.total)} />
    ) : (
      <WhatsAppAction
        enabled={isWhatsAppEnabled()}
        message={buildOrderMessage(details, summary, totals)}
        verifiedAt={verified && verification.status === 'verified' ? verification.at : null}
        onStale={() => live && void check(live)}
      />
    )

  return (
    <Sheet
      open={step !== null}
      onClose={close}
      labelledBy="pedido-titulo"
      headerTone="pino"
      dismissOnBackdrop={shownStep !== 'details' || !hasTypedText(details)}
      footer={footer}
      scrollResetKey={showingRates ? 'tarifas' : 'datos'}
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
              {showingRates ? 'Tarifas de la motito' : steps[shownStep].title}
            </h2>
            <p className="mt-1 text-[0.8125rem] font-semibold">Paso {steps[shownStep].number} de 3</p>
          </div>
        </>
      }
    >
      {shownStep === 'cart' ? (
        <div className="px-5 sm:px-6">
          <OrderStorageNotice placement="cart" />
          {empty ? <EmptyOrder /> : null}
          <OrderIssues issues={summary.issues} />
          <CartLines summary={summary} />
        </div>
      ) : null}
      {showingRates ? <DeliveryRatesView /> : null}
      {shownStep === 'details' && !showingRates ? (
        <CheckoutForm totals={totals} onValid={openMessage} onShowRates={() => setRatesOpen(true)} />
      ) : null}
      {shownStep === 'preview' && !verified ? (
        <VerificationPanel
          // A verified order that no longer matches what is on screen needs a new check, never a blank step.
          verification={verification.status === 'verified' ? { status: 'unverified', cartChanged: true } : verification}
          onRetry={() => live && void check(live)}
          onAccept={accept}
        />
      ) : null}
      {shownStep === 'preview' && verified ? <MessagePreview message={buildOrderMessage(details, summary, totals)} /> : null}
    </Sheet>
  )
}
