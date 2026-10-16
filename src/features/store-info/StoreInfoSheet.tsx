import { Bike, Clock, ExternalLink, MapPin, MessageCircle, Navigation, Wallet } from 'lucide-react'
import type { ReactNode } from 'react'
import { InstagramIcon } from '@/components/ui/InstagramIcon'
import { PedidosYaLink } from '@/components/ui/PedidosYaLink'
import { Sheet } from '@/components/ui/Sheet'
import { instagramUrl, storeInfo } from '@/data/store-info'
import { CREDIT_SURCHARGE_PERCENT, DELIVERY_SURCHARGE_PER_PIZZA, paymentOptions, type FulfillmentMode } from '@/features/checkout/prototype-order'
import { formatArs } from '@/lib/money'

function Fact({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <section className="flex gap-3">
      <span aria-hidden="true" className="mt-0.5 text-mostaza">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="font-bold">{title}</h3>
        <div className="mt-1 flex flex-col gap-1.5 text-[0.9375rem] leading-snug text-crema-muted">{children}</div>
      </div>
    </section>
  )
}

/**
 * "@heraldopizza" linking to the real profile (D8), at least 44 px tall.
 * Shows the official glyph unless the row already carries it as its icon.
 */
export function InstagramLink({ className = '', glyph = true }: { className?: string; glyph?: boolean }) {
  return (
    <a
      href={instagramUrl}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Instagram de ${storeInfo.name} (@${storeInfo.instagram})`}
      className={`flex min-h-11 w-fit items-center gap-2 font-semibold text-crema underline-offset-4 hover:underline ${className}`}
    >
      {glyph ? <InstagramIcon className="size-5" /> : null}@{storeInfo.instagram}
    </a>
  )
}

/** "efectivo, transferencia, débito o crédito (el crédito suma un 8 %)", from the same rules the checkout uses (RN-11). */
function paymentSentence(mode: FulfillmentMode): string {
  const options = paymentOptions(mode)
  const names = options.map((option) => option.label.toLocaleLowerCase('es-AR'))
  const list = names.length > 1 ? `${names.slice(0, -1).join(', ')} o ${names[names.length - 1]}` : names[0]
  const credit = options.some((option) => option.id === 'credito') ? ` (el crédito suma un ${CREDIT_SURCHARGE_PERCENT} %)` : ''
  return `${list}${credit}`
}

/**
 * Store info (D7, D9): where, when, how to order and pay, what delivery costs, and Instagram. Everything comes from
 * the requirements; whatever the owner has not confirmed (zone prices, rain and night surcharges) is not shown.
 */
export function StoreInfoSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Sheet
      open={open}
      onClose={onClose}
      labelledBy="info-titulo"
      header={
        <h2 id="info-titulo" className="type-display text-[1.5rem]">
          {storeInfo.name}
        </h2>
      }
    >
      <div className="flex flex-col gap-6 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:p-6">
        <Fact icon={<MapPin className="size-5" />} title="Dirección">
          <p>
            {storeInfo.address}, {storeInfo.city}
          </p>
          <a
            href={storeInfo.mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex min-h-11 items-center gap-2 rounded-xl bg-crema px-4 font-bold text-chapa transition-colors hover:bg-crema/85"
          >
            <Navigation aria-hidden="true" className="size-4" />
            Cómo llegar
          </a>
        </Fact>

        <Fact icon={<Clock className="size-5" />} title="Horarios">
          <p>{storeInfo.hours}</p>
        </Fact>

        {/* Plain text on purpose: the prototype never opens a chat with the store. */}
        <Fact icon={<MessageCircle className="size-5" />} title="Pedidos">
          <p>WhatsApp: {storeInfo.whatsappDisplay}</p>
          <p>Los pedidos se coordinan y se confirman por WhatsApp. Los precios y el total son orientativos hasta esa confirmación.</p>
          <p>Retiro en el local o envío a domicilio.</p>
        </Fact>

        <Fact icon={<Wallet className="size-5" />} title="Medios de pago">
          <p>Envío: {paymentSentence('envio')}.</p>
          <p>Retiro: {paymentSentence('retiro')}.</p>
        </Fact>

        <Fact icon={<Bike className="size-5" />} title="Envío">
          <p>El costo del envío depende de tu zona y lo confirma el local por WhatsApp.</p>
          <p>Cada pizza (entera, media o mitad y mitad) suma {formatArs(DELIVERY_SURCHARGE_PER_PIZZA)} en los envíos.</p>
          <p>No hay pedido mínimo.</p>
        </Fact>

        {/* The official glyph is the row icon, so the link itself shows only the handle. */}
        <Fact icon={<InstagramIcon className="size-5" />} title="Instagram">
          <InstagramLink glyph={false} className="-mt-1.5" />
        </Fact>

        <Fact icon={<ExternalLink className="size-5" />} title="Otro canal">
          <PedidosYaLink lead="También podés pedir en" className="mt-1" />
        </Fact>
      </div>
    </Sheet>
  )
}
