import { MessageCircle } from 'lucide-react'
import { ORDER_CONFIRMATION_NOTICE } from './notices'

/** The exact WhatsApp text (RF-19) as a chat bubble. */
export function MessageBubble({ message }: { message: string }) {
  return (
    <div data-testid="mensaje-whatsapp" className="rounded-2xl rounded-tr-md bg-chapa p-4 ring-1 ring-chapa-edge">
      <p className="text-[0.9375rem] leading-relaxed break-words whitespace-pre-wrap">{message}</p>
    </div>
  )
}

/** Final review step. Sending stays disabled in the prototype so no test order reaches the store. */
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

/**
 * The main WhatsApp action with its confirmation notice right above it (S3). The button opens WhatsApp with the
 * message ready; the customer sends it there, hence "Continuar". Disabled in the prototype so no test order
 * reaches the store. U8 turns it into the real `wa.me` link and keeps the notice.
 */
export function DisabledSendButton() {
  return (
    <div className="flex flex-col gap-3">
      <p id="confirmacion-pedido" className="text-[0.875rem] leading-snug">
        {ORDER_CONFIRMATION_NOTICE}
      </p>
      <div>
        <button
          type="button"
          disabled
          aria-describedby="confirmacion-pedido envio-desactivado"
          className="flex min-h-14 w-full cursor-not-allowed items-center justify-center gap-2 rounded-2xl bg-chapa-edge px-5 text-[1.0625rem] font-bold text-crema-muted"
        >
          <MessageCircle aria-hidden="true" className="size-5" />
          Continuar en WhatsApp
        </button>
        <p id="envio-desactivado" className="mt-2 text-center text-[0.875rem] leading-snug text-crema-muted">
          Desactivado en el prototipo: así no llegan pedidos de prueba al local.
        </p>
      </div>
    </div>
  )
}
