import { useEffect, useState, type ReactNode } from 'react'
import type { Product, Promotion } from '@/domain/catalog'
import { prototypeCategories, prototypeProducts } from '@/data/prototype-catalog'
import { Badge } from '@/components/ui/Badge'
import { PedidosYaLink } from '@/components/ui/PedidosYaLink'
import { PricePill } from '@/components/ui/PricePill'
import { Stepper } from '@/components/ui/Stepper'
import { useSheetHistory } from '@/components/ui/useSheetHistory'
import { CategoryStamp } from '@/features/catalog/CategoryStamp'
import { PizzaBuilderEntry } from '@/features/catalog/MenuSection'
import { BuilderSummary, FlavorList, PizzaBuilderSheet } from '@/features/catalog/PizzaBuilderSheet'
import { ProductSheet } from '@/features/catalog/ProductSheet'
import { CompactRow, PizzaRow, ProductRow } from '@/features/catalog/ProductRow'
import { loadDevPromotions } from '@/data/dev-promotions'
import { PromoCard } from '@/features/catalog/PromoRail'
import { initBuilder, type BuilderState } from '@/features/catalog/pizza-builder'
import { halfAndHalfCandidates } from '@/features/catalog/presentation'
import { CartBarView } from '@/features/cart/CartBar'
import { indexCatalog, reconcileOrder } from '@/features/cart/line-pricing'
import type { OrderLine } from '@/features/cart/order-lines'
import { MessageBubble } from '@/features/checkout/MessagePreview'
import { OrderTotalsCard } from '@/features/checkout/OrderTotalsCard'
import { buildOrderMessage, computeTotals, type CheckoutDetails } from '@/features/checkout/prototype-order'
import { WhatsAppAction } from '@/features/checkout/MessagePreview'
import { PrivacySheet } from '@/features/store-info/PrivacySheet'
import { SiteFooter } from '@/features/store-info/SiteFooter'

const swatches = [
  { name: 'Chapa', token: 'chapa', hex: '#131518', use: 'Fondo de la carta' },
  { name: 'Chapa alta', token: 'chapa-high', hex: '#1C1F23', use: 'Hojas, botones de precio' },
  { name: 'Filo', token: 'chapa-edge', hex: '#2E3237', use: 'Separadores y bordes' },
  { name: 'Pino', token: 'pino', hex: '#D29A55', use: 'El mostrador: tu pedido' },
  { name: 'Rojo Heraldo', token: 'heraldo', hex: '#D7191F', use: 'Acciones: sumar, continuar' },
  { name: 'Mostaza', token: 'mostaza', hex: '#F5A524', use: 'Cantidades, precios destacados, foco' },
  { name: 'Crema', token: 'crema', hex: '#F4EFE7', use: 'Texto principal' },
  { name: 'Crema baja', token: 'crema-muted', hex: '#AEA79D', use: 'Texto secundario' },
]

function findProduct(name: string): Product {
  const product = prototypeProducts.find((item) => item.name === name)
  if (!product) throw new Error(`Missing prototype product: ${name}`)
  return product
}

function variantId(product: Product, name: string): string {
  const variant = product.variants.find((item) => item.name === name)
  if (!variant) throw new Error(`Missing variant ${name} of ${product.name}`)
  return variant.id
}

function Block({ title, note, children }: { title: string; note?: string; children?: ReactNode }) {
  return (
    <section className="border-t border-chapa-edge py-10">
      <h2 className="type-display text-[2rem]">{title}</h2>
      {note ? <p className="mt-2 max-w-[65ch] text-[0.9375rem] text-crema-muted">{note}</p> : null}
      {children ? <div className="mt-6">{children}</div> : null}
    </section>
  )
}

const muzzarella = findProduct('Muzzarella')
const especial = findProduct('Especial')
const napolitanaHeraldo = findProduct('Napolitana Heraldo')

const sampleLines: OrderLine[] = [
  { id: 'a', kind: 'product', productId: muzzarella.id, variantId: variantId(muzzarella, 'Entera'), quantity: 1, note: 'sin aceitunas' },
  { id: 'm', kind: 'product', productId: especial.id, variantId: variantId(especial, 'Media'), quantity: 1, note: '' },
  { id: 'b', kind: 'half', firstProductId: muzzarella.id, secondProductId: napolitanaHeraldo.id, quantity: 1, note: '' },
  {
    id: 'c',
    kind: 'product',
    productId: findProduct('Empanada de carne picada').id,
    variantId: variantId(findProduct('Empanada de carne picada'), 'Unidad'),
    quantity: 2,
    note: '',
  },
]
const sampleDetails: CheckoutDetails = { name: 'Nombre de prueba', mode: 'envio', address: 'Dirección de prueba 123', payment: 'efectivo', note: '' }
const pizzaFlavors = halfAndHalfCandidates(prototypeProducts, prototypeCategories)
const sampleSummary = reconcileOrder(sampleLines, indexCatalog(prototypeCategories, prototypeProducts, []))
const sampleTotals = computeTotals(sampleSummary, sampleDetails)

/** A live configurator specimen starting from a fixed state, with a short flavor list. */
function BuilderSpecimen({ label, initial }: { label: string; initial: BuilderState }) {
  const [state, setState] = useState(initial)
  const flavors = pizzaFlavors.slice(0, 4).concat(pizzaFlavors.filter((product) => product.id === napolitanaHeraldo.id))
  return (
    <figure className="overflow-hidden rounded-2xl bg-chapa-high ring-1 ring-chapa-edge">
      <BuilderSummary state={state} candidates={pizzaFlavors} onChange={setState} sticky={false} />
      <div className="p-4">
        <FlavorList state={state} candidates={flavors} onChange={setState} />
      </div>
      <figcaption className="border-t border-chapa-edge px-4 py-2 text-[0.875rem] text-crema-muted">{label}</figcaption>
    </figure>
  )
}

export function DesignSystemView() {
  const sheet = useSheetHistory<Product>('producto')
  const builder = useSheetHistory<{ firstId: string | null }>('armar-pizza')
  const privacy = useSheetHistory<true>('privacidad')
  const [pillQuantity, setPillQuantity] = useState(2)
  const [stepperValue, setStepperValue] = useState(0)
  // Taps per promo card, so each card shows only its own count.
  const [promoQuantities, setPromoQuantities] = useState<Record<string, number>>({})
  // The owner's real promotions, as prototype data in development only (none in production until U9).
  const [promotions, setPromotions] = useState<Promotion[]>([])
  useEffect(() => {
    let active = true
    loadDevPromotions().then(
      (loaded) => {
        if (active) setPromotions(loaded)
      },
      // Without the prototype data the block just explains that there is no source yet.
      () => undefined,
    )
    return () => {
      active = false
    }
  }, [])
  const [bump, setBump] = useState(0)
  const [showFeedback, setShowFeedback] = useState(false)

  return (
    <div className="texture-chapa min-h-dvh">
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <a href="#" className="inline-flex min-h-11 items-center text-[0.9375rem] font-semibold text-mostaza underline underline-offset-4">
          Volver a la carta
        </a>
        <h1 className="type-display mt-4 text-[clamp(2.5rem,11vw,4.5rem)]">Sistema de diseño</h1>
        <p className="mt-4 max-w-[62ch] text-crema-muted">
          El mostrador: la carta vive sobre la chapa negra del local y tu pedido sobre el pino del mostrador. El rojo es
          para actuar; la mostaza, para cantidades y precios. Esta versión no tiene fotos de productos: cada categoría
          lleva su marca grabada en pino. Los estados que el catálogo todavía no tiene (sin stock, promos) están aclarados
          en cada bloque.
        </p>

        <Block title="Color">
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {swatches.map((swatch) => (
              <li key={swatch.token}>
                <div
                  className={`h-16 rounded-xl ring-1 ring-chapa-edge ${swatch.token === 'pino' ? 'texture-pino' : ''}`}
                  style={swatch.token === 'pino' ? undefined : { backgroundColor: `var(--color-${swatch.token})` }}
                />
                <p className="mt-2 text-sm font-bold">{swatch.name}</p>
                <p className="text-xs text-crema-muted">
                  {swatch.hex}. {swatch.use}
                </p>
              </li>
            ))}
          </ul>
        </Block>

        <Block title="Tipografía" note="Archivo con su eje de ancho: expandida y pesada para los títulos, normal para leer, semiexpandida y tabular para los precios.">
          <div className="space-y-3">
            <p className="type-display text-[clamp(1.875rem,8.5vw,2.75rem)]">Pizzas</p>
            <p className="text-[1.125rem] font-bold [font-stretch:106%]">Napolitana Heraldo</p>
            <p className="max-w-[60ch] text-[0.9375rem] leading-snug text-crema-muted">{napolitanaHeraldo.description}</p>
            <p className="type-price text-[1.0625rem]">$ 14.500</p>
            <p className="type-price text-[1.25rem] text-mostaza">$ 49.000</p>
          </div>
        </Block>

        <Block
          title="Marcas de categoría"
          note="Una marca por categoría, grabada en el pino real del local: ícono de línea en tinta de pino. Aparecen en el título de cada sección y en el índice de categorías."
        >
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {prototypeCategories.map((category) => (
              <li key={category.id} className="flex items-center gap-3">
                <CategoryStamp name={category.name} />
                <span className="text-[0.9375rem] font-semibold">{category.name}</span>
              </li>
            ))}
          </ul>
        </Block>

        <Block
          title="Filas de pizza"
          note="El nombre abre la hoja del producto. La entera se suma con un toque; la media abre «Armá tu pizza» con ese gusto como primera mitad."
        >
          <ul className="max-w-xl">
            <PizzaRow product={muzzarella} onOpen={sheet.open} onBuild={(product) => builder.open({ firstId: product.id })} />
            <PizzaRow product={especial} onOpen={sheet.open} onBuild={(product) => builder.open({ firstId: product.id })} />
          </ul>
        </Block>

        <Block
          title="Armá tu pizza"
          note="Primera mitad obligatoria, segunda opcional. Con un gusto es media pizza; con dos, mitad y mitad. El gusto de una mitad queda deshabilitado en la otra."
        >
          <div className="max-w-xl">
            <PizzaBuilderEntry onOpen={() => builder.open({ firstId: null })} />
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <BuilderSpecimen label="Vacío" initial={initBuilder()} />
            <BuilderSpecimen label="Media pizza" initial={initBuilder(muzzarella.id)} />
            <BuilderSpecimen
              label="Mitad y mitad: Muzzarella queda deshabilitada en la otra mitad"
              initial={{ first: muzzarella.id, second: napolitanaHeraldo.id, active: 'second' }}
            />
          </div>
        </Block>

        <Block title="Estados" note="«Sin stock» es un ejemplo: ese estado no figura en el catálogo. «Por encargo» y «Consultar en barra» son datos reales.">
          <ul className="max-w-xl">
            <PizzaRow product={{ ...findProduct('Fugazzeta'), inStock: false }} onOpen={sheet.open} onBuild={() => {}} />
            <ProductRow product={findProduct('Ensaimada')} onOpen={sheet.open} />
            <CompactRow product={findProduct('Café cortado')} onOpen={sheet.open} />
            <CompactRow product={findProduct('Vigilante')} onOpen={sheet.open} />
          </ul>
        </Block>

        <Block title="Botón de precio" note="Normal, con cantidad en el pedido (tocalo para sumar) y deshabilitado.">
          <div className="grid max-w-xl grid-cols-2 gap-3 sm:grid-cols-3">
            <PricePill price={16000} label="Entera" quantity={0} actionLabel="Ejemplo" onAdd={() => setPillQuantity((value) => value + 1)} />
            <PricePill price={10500} label="Media" quantity={pillQuantity} actionLabel="Ejemplo con cantidad" onAdd={() => setPillQuantity((value) => value + 1)} />
            <PricePill price={13500} label="Media" quantity={0} actionLabel="Ejemplo sin stock" onAdd={() => {}} disabled />
          </div>
        </Block>

        <Block title="Cantidad" note="En cero muestra solo el «+», como en las empanadas.">
          <div className="flex flex-wrap items-center gap-6">
            <Stepper
              value={stepperValue}
              itemLabel="ejemplo"
              collapseAtZero
              onIncrement={() => setStepperValue((value) => value + 1)}
              onDecrement={() => setStepperValue((value) => Math.max(0, value - 1))}
            />
            <div className="texture-pino rounded-xl p-2">
              <Stepper
                value={Math.max(1, stepperValue)}
                itemLabel="ejemplo sobre pino"
                tone="pino"
                onIncrement={() => setStepperValue((value) => value + 1)}
                onDecrement={() => setStepperValue((value) => Math.max(0, value - 1))}
              />
            </div>
          </div>
        </Block>

        <Block
          title="Barra del pedido"
          note="En el celular, abajo y al alcance del pulgar, solo cuando el pedido tiene productos. Al final de la página queda debajo del pie, así nunca lo tapa. Al sumar, rebota y muestra lo que agregaste por un momento. Tocala para ver el efecto."
        >
          <div className="max-w-md">
            <CartBarView
              count={3}
              total={36500}
              bumpKey={bump}
              message={showFeedback ? 'Agregaste Muzzarella entera' : null}
              onOpen={() => {
                setBump((value) => value + 1)
                setShowFeedback((value) => !value)
              }}
            />
          </div>
        </Block>

        <Block
          title="Promos"
          note={
            promotions.length > 0
              ? 'Promos reales del local, cargadas solo en desarrollo como datos de prototipo hasta que exista la fuente real (U9). Cada parte del combo va en su renglón; el precio y el botón, sobre la tabla de pino.'
              : 'Todavía no hay una fuente de promociones (llega en U9): en producción la sección no se muestra.'
          }
        >
          {promotions.length > 0 ? (
            <div className="grid max-w-3xl gap-3 sm:grid-cols-3">
              {promotions.slice(0, 3).map((promotion) => (
                <PromoCard
                  key={promotion.id}
                  promotion={promotion}
                  quantity={promoQuantities[promotion.id] ?? 0}
                  onAdd={() => setPromoQuantities((counts) => ({ ...counts, [promotion.id]: (counts[promotion.id] ?? 0) + 1 }))}
                />
              ))}
            </div>
          ) : null}
        </Block>

        <Block title="Resumen y mensaje" note="Ejemplo con datos de prueba. En el prototipo el mensaje se muestra pero no se envía.">
          <div className="grid max-w-3xl gap-4 sm:grid-cols-2 sm:items-start">
            <OrderTotalsCard totals={sampleTotals} />
            <MessageBubble message={buildOrderMessage(sampleDetails, sampleSummary, sampleTotals)} />
          </div>
        </Block>

        <Block title="Etiquetas">
          <div className="flex flex-wrap gap-2">
            <Badge tone="made-to-order">Por encargo</Badge>
            <Badge tone="out-of-stock">Sin stock</Badge>
          </div>
        </Block>

        <Block
          title="Canal secundario y aviso"
          note="WhatsApp es el canal principal: el botón rojo del pedido. PedidosYa es una alternativa discreta, solo en el pie y en la información del local. El aviso de confirmación va pegado al botón de WhatsApp; el botón está desactivado en el prototipo. El logo de PedidosYa se muestra como texto hasta que el dueño entregue el archivo oficial."
        >
          <div className="flex max-w-md flex-col gap-4">
            <PedidosYaLink lead="También en" />
            <WhatsAppAction enabled={false} message="" verifiedAt={null} onStale={() => undefined} />
          </div>
        </Block>

        <Block title="Pie de página" note="Cierra la página como el encabezado la abre: el mismo anillo de pino alrededor del logo y el mismo filo de la barra de categorías. Solo lo que hace falta para llegar al local." />
      </div>
      <SiteFooter onOpenPrivacy={() => privacy.open(true)} />

      <ProductSheet product={sheet.value} onClose={sheet.close} />
      <PizzaBuilderSheet request={builder.value} candidates={pizzaFlavors} onClose={builder.close} />
      <PrivacySheet open={privacy.value !== null} onClose={privacy.close} />
    </div>
  )
}
