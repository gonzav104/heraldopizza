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
 * analytics, and the network are backed by `privacy-claims.test.ts`: the only request is the catalog GET to Supabase
 * (U3b), the only storage is the order saved by `order-storage.ts` (RF-17), and the test fails when the code starts
 * using anything else.
 * The text describes the WhatsApp flow (RF-20): the order is checked against a fresh catalog (P6a, the same catalog
 * request) and «Continuar en WhatsApp» is a wa.me link (P6b), offered only when VITE_WHATSAPP_ENABLED is «true».
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
            también tu dirección. Las aclaraciones de cada producto y la nota general son opcionales.
          </p>
        </Topic>

        <Topic title="Para qué los usamos">
          <p>Solo para armar el mensaje de WhatsApp con tu pedido.</p>
          <p>
            La carta, las promociones y sus precios se descargan desde nuestra base de datos alojada en Supabase. Al consultar la carta no
            enviamos a esa base de datos el contenido de tu pedido ni los datos que ingreses para armarlo. El pedido permanece
            en tu dispositivo hasta que decidís enviarlo por WhatsApp.
          </p>
          <p>
            Antes de mostrarte el mensaje volvemos a consultar la carta para confirmar precios y disponibilidad; esa
            consulta tampoco incluye tu pedido ni tus datos.
          </p>
          <p>No utilizamos cookies ni herramientas de análisis.</p>
        </Topic>

        <Topic title="Qué queda guardado en tu dispositivo">
          <p>
            Para que no pierdas el pedido si recargás la página, este navegador guarda los productos que elegiste, sus
            cantidades y las aclaraciones que escribiste en cada uno. Ese pedido guardado no se envía a ningún lado.
          </p>
          <p>
            Tu nombre, tu dirección, la forma de pago y la nota general no quedan guardados: se borran al recargar o cerrar la
            página. Los precios tampoco: siempre se toman de la carta vigente.
          </p>
          <p>
            Las aclaraciones quedan guardadas tal como las escribiste, así que evitá poner en ellas datos personales. Para
            borrar el pedido guardado, quitá los productos de tu pedido o borrá los datos de este sitio en tu navegador.
          </p>
        </Topic>

        <Topic title="Vos decidís si lo enviás">
          <p>
            Armar el pedido no lo envía. Al final, «Continuar en WhatsApp» abre WhatsApp con el mensaje escrito; abrirlo no
            envía nada y vos decidís si lo mandás. Hasta que lo envíes desde WhatsApp, {storeInfo.name} no recibe nada.
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
