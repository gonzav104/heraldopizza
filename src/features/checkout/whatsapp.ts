// The WhatsApp link that hands the order to the customer (P6b-1, RF-20). Opening it sends nothing: WhatsApp opens with
// the message written, the customer decides whether to send it, and the store confirms the order there.

/** Settings that decide whether the real link is offered. */
export interface WhatsAppEnv {
  readonly VITE_WHATSAPP_ENABLED?: string
}

/**
 * Off unless the build says exactly «true» (owner decision, 2026-10-22: the number is confirmed, opening it is not
 * authorized yet). No environment of this project sets it, production included, so tests and previews never reach
 * the store.
 */
export function isWhatsAppEnabled(env: WhatsAppEnv = import.meta.env): boolean {
  return env.VITE_WHATSAPP_ENABLED === 'true'
}

/**
 * `https://wa.me/<number>?text=<message>`: the official short link, the number in international format (digits only,
 * no «+»), and the message as its only parameter, encoded with encodeURIComponent. Nothing else goes in the URL.
 */
export function buildWhatsAppUrl(number: string, message: string): string {
  if (!/^\d{10,15}$/.test(number)) throw new Error('The WhatsApp number must be digits in international format')
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`
}
