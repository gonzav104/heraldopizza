import type { ReactNode } from 'react'
import { Sheet } from '@/components/ui/Sheet'
import { storeInfo } from '@/data/store-info'
import { InstagramLink } from './StoreInfoSheet'

function Topic({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="text-[1rem] font-bold">{title}</h3>
      <div className="mt-1.5 flex flex-col gap-1 text-[0.9375rem] leading-relaxed text-crema-muted">{children}</div>
    </section>
  )
}

/**
 * Privacy notice (S2): short, in plain words, and only what the app really does. The claims about cookies, storage,
 * analytics, and servers are backed by `privacy-claims.test.ts`, which fails when the code starts using any of them.
 * The text describes the finished WhatsApp flow (RF-20, built in U8); the prototype never opens WhatsApp.
 * Not written here on purpose, because the business has not provided it: legal name, CUIT, registration of the
 * database, an e-mail address, and how long the store keeps its WhatsApp conversations.
 */
export function PrivacySheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Sheet
      open={open}
      onClose={onClose}
      labelledBy="privacidad-titulo"
      header={
        <h2 id="privacidad-titulo" className="type-display text-[1.5rem]">
          Privacidad
        </h2>
      }
    >
      <div className="flex flex-col gap-6 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:p-6">
        <Topic title="Qué datos te pedimos">
          <p>
            Para preparar tu pedido te pedimos tu nombre y apellido, si es envío o retiro y la forma de pago. Si es envío,
            también tu dirección y tu zona. Las aclaraciones de cada producto y la nota general son opcionales.
          </p>
        </Topic>

        <Topic title="Para qué los usamos">
          <p>
            Solo para armar el mensaje de WhatsApp con tu pedido. Mientras lo armás, lo que escribís queda en tu dispositivo y
            la página no lo envía a ningún servidor.
          </p>
          <p>La página no usa cookies, ni herramientas de análisis o publicidad.</p>
        </Topic>

        <Topic title="Vos decidís si lo enviás">
          <p>
            Armar el pedido no lo envía. Al final se abre WhatsApp con el mensaje listo y vos decidís si lo mandás. Hasta que
            lo envíes desde WhatsApp, {storeInfo.name} no recibe nada.
          </p>
        </Topic>

        <Topic title="Si lo enviás">
          <p>
            Al enviar el mensaje, tus datos los recibe {storeInfo.name}, que los usa para atender tu pedido, y también se tratan
            a través de WhatsApp, un servicio de Meta con sus propias condiciones y política de privacidad.
          </p>
        </Topic>

        <Topic title="Consultas sobre tus datos">
          <p>
            Para consultar, corregir o pedir la eliminación de tus datos, escribile a {storeInfo.name} por WhatsApp al{' '}
            {storeInfo.whatsappDisplay}, por Instagram, o acercate a {storeInfo.address}, {storeInfo.city}.
          </p>
          <InstagramLink className="-mt-0.5" />
        </Topic>
      </div>
    </Sheet>
  )
}
