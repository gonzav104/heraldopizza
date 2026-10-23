import { MessageCircle } from 'lucide-react'
import { useId } from 'react'
import { storeInfo } from '@/data/store-info'
import { ORDER_CONFIRMATION_NOTICE } from './notices'
import { isVerificationCurrent } from './order-verification'
import { buildWhatsAppUrl } from './whatsapp'

/** The exact WhatsApp text (RF-19) as a chat bubble. */
export function MessageBubble({ message }: { message: string }) {
  return (
    <div data-testid="mensaje-whatsapp" className="rounded-2xl rounded-tr-md bg-chapa p-4 ring-1 ring-chapa-edge">
      <p className="text-[0.9375rem] leading-relaxed break-words whitespace-pre-wrap">{message}</p>
    </div>
  )
}

/** Final review step: the message exactly as WhatsApp will receive it, once the order is verified (P6a). */
export function MessagePreview({ message }: { message: string }) {
  return (
    <div className="flex flex-col gap-4 p-5 sm:p-6">
      <p className="text-[0.9375rem] leading-snug text-crema-muted">
        El total es orientativo y lo confirma el local.
      </p>
      <MessageBubble message={message} />
    </div>
  )
}

const actionClass =
  'flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl px-5 text-[1.0625rem] font-bold transition-colors'

/**
 * The main WhatsApp action with its confirmation notice right above it (S3), always «Continuar en WhatsApp»: the
 * customer sends the message from WhatsApp, and the store confirms the order there (P6b-1).
 * - The setting off (the default, production included): a disabled button and why.
 * - No current verification: a disabled button with no link, so it can never navigate.
 * - A current verification: a real link to wa.me in a new tab, followed by the browser from the tap itself (no
 *   window.open after an await, which phones block). If the check expired by the time of the tap (10 minutes, or
 *   midnight in Argentina), the navigation is stopped and a new check starts; the customer taps again once it is done.
 * The cart is never emptied on the way out (RF-21 is F2).
 */
export function WhatsAppAction({
  enabled,
  message,
  verifiedAt,
  onStale,
}: {
  enabled: boolean
  message: string
  /** When the order was verified, or null when it is not (checking, changed, failed, expired). */
  verifiedAt: number | null
  onStale: () => void
}) {
  const noticeId = useId()
  const reasonId = useId()
  const icon = <MessageCircle aria-hidden="true" className="size-5" />
  const action =
    enabled && verifiedAt !== null ? (
      <a
        href={buildWhatsAppUrl(storeInfo.whatsappNumber, message)}
        target="_blank"
        rel="noopener noreferrer"
        aria-describedby={noticeId}
        onClick={(event) => {
          if (isVerificationCurrent(new Date(verifiedAt), new Date())) return
          event.preventDefault()
          onStale()
        }}
        className={`${actionClass} bg-heraldo text-white hover:bg-heraldo-deep`}
      >
        {icon}
        Continuar en WhatsApp
      </a>
    ) : (
      <button
        type="button"
        disabled
        aria-describedby={enabled ? noticeId : `${noticeId} ${reasonId}`}
        className={`${actionClass} cursor-not-allowed bg-chapa-edge text-crema-muted`}
      >
        {icon}
        Continuar en WhatsApp
      </button>
    )
  return (
    <div className="flex flex-col gap-3">
      <p id={noticeId} className="text-[0.875rem] leading-snug">
        {ORDER_CONFIRMATION_NOTICE}
      </p>
      <div>
        {action}
        {!enabled ? (
          <p id={reasonId} className="mt-2 text-center text-[0.875rem] leading-snug text-crema-muted">
            Todavía no está habilitado: así no llegan pedidos de prueba al local.
          </p>
        ) : null}
      </div>
    </div>
  )
}
