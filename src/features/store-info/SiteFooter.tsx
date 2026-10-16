import { MapPin, MessageCircle } from 'lucide-react'
import { PedidosYaLink } from '@/components/ui/PedidosYaLink'
import { storeInfo } from '@/data/store-info'
import { InstagramLink } from './StoreInfoSheet'

/**
 * Footer that closes the page the way the header opens it: the same pine ring around the logo, the same pine edge as the
 * category bar, and only what a customer needs to reach the store. Hours stay in the header and the info sheet.
 * WhatsApp is the main channel, so PedidosYa is just one more quiet pill next to Instagram. "Privacidad" opens the
 * privacy notice. Centered on phones; brand beside the contact from 768 px.
 */
export function SiteFooter({ onOpenPrivacy }: { onOpenPrivacy: () => void }) {
  return (
    <footer className="texture-chapa mt-16 bg-chapa-high/40">
      <div aria-hidden="true" className="texture-pino h-1" />
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-8 px-4 pt-10 pb-8 text-center sm:px-6 md:flex-row md:items-start md:justify-between md:gap-10 md:text-left">
        <div className="flex flex-col items-center gap-3 md:flex-row md:gap-4">
          <span className="texture-pino size-[4.5rem] shrink-0 rounded-full p-[3px] shadow-[0_8px_18px_-6px_rgb(0_0_0/0.85)]">
            <span className="grid size-full place-items-center rounded-full bg-chapa">
              <img src="/images/logo-heraldo-pizza.webp" alt="" width={72} height={72} loading="lazy" className="size-[88%]" />
            </span>
          </span>
          <p className="type-display text-[1.75rem] whitespace-nowrap">{storeInfo.name}</p>
        </div>

        <div className="flex flex-col items-center gap-3 md:items-start">
          <address className="flex flex-col items-center gap-1 not-italic md:items-start">
            <a
              href={storeInfo.mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Cómo llegar: ${storeInfo.address}, ${storeInfo.city}`}
              className="inline-flex min-h-11 items-center gap-2 font-semibold whitespace-nowrap underline-offset-4 hover:underline"
            >
              <MapPin aria-hidden="true" className="size-4.5 shrink-0 text-mostaza" />
              {storeInfo.address}, {storeInfo.city}
            </a>
            {/* Plain text on purpose: the prototype never opens a chat with the store. */}
            <p className="flex min-h-8 items-center gap-2 whitespace-nowrap text-crema-muted">
              <MessageCircle aria-hidden="true" className="size-4.5 shrink-0 text-mostaza" />
              WhatsApp: {storeInfo.whatsappDisplay}
            </p>
          </address>
          <div className="flex flex-wrap justify-center gap-2 md:justify-start">
            <InstagramLink className="rounded-full bg-chapa-high px-5 ring-1 ring-chapa-edge hover:bg-chapa-edge hover:no-underline" />
            <PedidosYaLink lead="También en" />
          </div>
        </div>
      </div>

      <div className="mx-auto flex max-w-6xl flex-col items-center gap-x-6 border-t border-chapa-edge px-4 py-3 text-center text-[0.875rem] text-crema-muted sm:flex-row sm:justify-between sm:px-6 sm:text-left">
        <p>Precios en pesos argentinos. El total es orientativo: lo confirma el local por WhatsApp.</p>
        <button
          type="button"
          onClick={onOpenPrivacy}
          aria-haspopup="dialog"
          className="inline-flex min-h-11 items-center px-2 font-semibold text-crema underline underline-offset-4 hover:text-mostaza"
        >
          Privacidad
        </button>
      </div>
    </footer>
  )
}
