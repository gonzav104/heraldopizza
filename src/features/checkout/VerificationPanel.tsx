import { useId } from 'react'
import { formatArs } from '@/lib/money'
import type { OrderComparison } from './order-verification'
import type { Verification } from './useOrderVerification'

const buttonClass =
  'inline-flex min-h-12 items-center justify-center rounded-full bg-heraldo px-6 font-bold text-white transition-colors hover:bg-heraldo-deep'

/**
 * What the message step shows until the order is verified (P6a-3): the check in progress, a price or total change to
 * accept, a network failure, an expired check, or a cart that changed while it was checked. `null` once verified.
 */
export function VerificationPanel({
  verification,
  changedAfterCheck = false,
  onRetry,
  onAccept,
}: {
  verification: Verification
  /** Wording only: the order changed after it was verified, not while it was being checked. */
  changedAfterCheck?: boolean
  onRetry: () => void
  onAccept: () => void
}) {
  switch (verification.status) {
    case 'verified':
    case 'invalid':
      return null
    case 'checking':
      return (
        <p role="status" className="p-5 text-[0.9375rem] font-semibold sm:p-6">
          Verificando precios y disponibilidad…
        </p>
      )
    case 'changed':
      return <Changes comparison={verification.comparison} onAccept={onAccept} />
    case 'failed':
      return (
        <Notice
          role="alert"
          text={
            verification.reason === 'timeout'
              ? 'La verificación tardó demasiado. Revisá tu conexión e intentá de nuevo.'
              : 'No pudimos verificar tu pedido. Revisá tu conexión e intentá de nuevo.'
          }
          action="Reintentar"
          onAction={onRetry}
        />
      )
    case 'expired':
      return (
        <Notice
          role="status"
          text="La verificación venció. Verificá tu pedido de nuevo para continuar."
          action="Volver a verificar"
          onAction={onRetry}
        />
      )
    case 'unverified':
      return (
        <Notice
          role="status"
          text={
            changedAfterCheck
              ? 'El pedido cambió después de la última verificación. Verificalo de nuevo para continuar.'
              : verification.cartChanged
                ? 'El pedido cambió mientras lo verificábamos. Verificalo de nuevo para continuar.'
                : 'Verificá tu pedido para continuar.'
          }
          action="Verificar de nuevo"
          onAction={onRetry}
        />
      )
  }
}

function Notice({ role, text, action, onAction }: { role: 'status' | 'alert'; text: string; action: string; onAction: () => void }) {
  return (
    <div className="flex flex-col items-start gap-4 p-5 sm:p-6">
      <p role={role} className="text-[0.9375rem] leading-snug font-semibold">
        {text}
      </p>
      <button type="button" className={buttonClass} onClick={onAction}>
        {action}
      </button>
    </div>
  )
}

/** Before and after, line by line, and the total; the message opens only once the customer accepts. */
function Changes({ comparison, onAccept }: { comparison: OrderComparison; onAccept: () => void }) {
  const headingId = useId()
  const prices = comparison.priceChanges.length > 0
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-4 p-5 sm:p-6">
      <div className="rounded-2xl bg-chapa p-4 ring-1 ring-mostaza/70">
        <h3 id={headingId} className="text-[1.0625rem] font-bold text-mostaza">
          {prices ? 'Cambiaron precios' : 'Cambió el total'}
        </h3>
        <p className="mt-1 text-[0.9375rem] leading-snug text-crema-muted">
          {prices
            ? 'La carta se actualizó desde que armaste el pedido. Revisá los importes nuevos.'
            : 'La forma de pago cambió el total del pedido.'}
        </p>
        {prices ? (
          <ul className="mt-3 flex flex-col gap-1.5 text-[0.9375rem]">
            {comparison.priceChanges.map((change) => (
              <li key={change.key}>
                {change.quantity} × {change.title}
                {change.detail ? ` (${change.detail})` : ''}: {formatArs(change.before.subtotal)} → {formatArs(change.after.subtotal)}
              </li>
            ))}
          </ul>
        ) : null}
        <p className="mt-3 font-bold">
          Total orientativo: {formatArs(comparison.totalBefore)} → {formatArs(comparison.totalAfter)}
        </p>
      </div>
      <button type="button" className={buttonClass} onClick={onAccept}>
        Aceptar el total actualizado
      </button>
    </section>
  )
}
