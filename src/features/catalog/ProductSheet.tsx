import { useState } from 'react'
import type { Product } from '@/domain/catalog'
import { PrimaryAction } from '@/components/ui/PrimaryAction'
import { formatArs } from '@/lib/money'
import { Sheet } from '@/components/ui/Sheet'
import { Stepper } from '@/components/ui/Stepper'
import { useSheetContent } from '@/components/ui/useSheetHistory'
import { useOrderStore } from '@/features/cart/order-store'
import { NOTE_MAX_LENGTH } from '@/features/cart/order-lines'
import { ProductStates } from './ProductRow'
import { halfPrice, sheetVariants, visibleVariantName } from './presentation'

const MAX_QUANTITY = 20
const TITLE_ID = 'hoja-producto-titulo'

interface ProductSheetProps {
  product: Product | null
  onClose: () => void
  /** Pizzas: close this sheet, then open "Armá tu pizza" with the flavor as the first half (never stacked). */
  onBuildPizza?: (product: Product) => void
  onAfterClose?: () => void
}

/**
 * Product detail: choose a variant, quantity, and an optional note (RF-13, RF-14), then add it.
 * Bottom sheet on phones, centered on wide screens.
 */
export function ProductSheet({ product, onClose, onBuildPizza, onAfterClose }: ProductSheetProps) {
  const { shown, session } = useSheetContent(product)
  return shown ? (
    <ProductSheetContent
      key={session}
      product={shown}
      open={product !== null}
      onClose={onClose}
      onBuildPizza={onBuildPizza}
      onAfterClose={onAfterClose}
    />
  ) : null
}

function ProductSheetContent({
  product,
  open,
  onClose,
  onBuildPizza,
  onAfterClose,
}: Omit<ProductSheetProps, 'product'> & { product: Product; open: boolean }) {
  const add = useOrderStore((state) => state.add)
  // Pizzas offer only the whole one here (D1).
  const orderable = sheetVariants(product)
  const canBuildHalf = onBuildPizza !== undefined && product.inStock && halfPrice(product) !== null
  const [variantId, setVariantId] = useState(orderable[0]?.id)
  const [quantity, setQuantity] = useState(1)
  const [note, setNote] = useState('')
  const selected = orderable.find((variant) => variant.id === variantId)

  const submit = () => {
    if (!selected || !product.inStock) return
    add({ kind: 'product', productId: product.id, variantId: selected.id, quantity, note })
    onClose()
  }

  const footer =
    orderable.length > 0 ? (
      <PrimaryAction
        onClick={submit}
        disabled={!product.inStock || !selected}
        label={product.inStock && selected ? 'Agregar' : 'Sin stock'}
        amount={product.inStock && selected ? formatArs(selected.price * quantity) : null}
      />
    ) : undefined

  return (
    <Sheet
      open={open}
      onClose={onClose}
      onAfterClose={onAfterClose}
      labelledBy={TITLE_ID}
      footer={footer}
      dismissOnBackdrop={note.trim() === ''}
    >
      <div className="flex flex-col gap-5 p-5 sm:p-6">
        <div className="pr-12">
          <h2 id={TITLE_ID} className="type-display text-[1.75rem]">
            {product.name}
          </h2>
          {product.description ? <p className="mt-2 text-[1rem] leading-snug text-crema-muted">{product.description}</p> : null}
          <ProductStates product={product} />
        </div>

        {orderable.length === 0 ? (
          <p className="rounded-xl bg-chapa p-4 text-[0.9375rem] ring-1 ring-chapa-edge">
            <span className="font-semibold text-mostaza">Consultar en barra.</span>{' '}
            <span className="text-crema-muted">Este producto no tiene precio publicado y no se puede sumar al pedido.</span>
          </p>
        ) : (
          <>
            {orderable.length > 1 ? (
              <fieldset className="flex flex-col gap-2">
                <legend className="mb-2 text-[0.9375rem] font-semibold">Elegí una opción</legend>
                {orderable.map((variant) => {
                  const checked = variant.id === variantId
                  return (
                    <label
                      key={variant.id}
                      className={`flex min-h-13 cursor-pointer items-center gap-3 rounded-xl px-4 ring-1 transition-colors has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-mostaza ${
                        checked ? 'bg-heraldo/15 ring-heraldo' : 'bg-chapa ring-chapa-edge hover:ring-crema-muted/60'
                      }`}
                    >
                      <input
                        type="radio"
                        name="variante"
                        value={variant.id}
                        checked={checked}
                        onChange={() => setVariantId(variant.id)}
                        className="size-5 accent-heraldo"
                      />
                      <span className="flex-1 font-semibold">{visibleVariantName(variant.name, product.variants.length) ?? product.name}</span>
                      <span className="type-price text-[1.0625rem]">{formatArs(variant.price)}</span>
                    </label>
                  )
                })}
                {product.variants.length > orderable.length ? (
                  <p className="text-[0.875rem] text-crema-muted">Otras opciones: consultar en barra.</p>
                ) : null}
              </fieldset>
            ) : (
              <p className="flex items-baseline justify-between gap-3 rounded-xl bg-chapa px-4 py-3 ring-1 ring-chapa-edge">
                <span className="font-semibold">{visibleVariantName(orderable[0].name, product.variants.length) ?? 'Precio'}</span>
                <span className="type-price text-[1.0625rem]">{formatArs(orderable[0].price)}</span>
              </p>
            )}

            {canBuildHalf ? (
              <button
                type="button"
                onClick={() => onBuildPizza?.(product)}
                aria-haspopup="dialog"
                className="-my-2 inline-flex min-h-11 items-center self-start text-left text-[0.9375rem] font-semibold text-mostaza underline decoration-mostaza/50 underline-offset-4 hover:decoration-mostaza"
              >
                ¿Querés media o mitad y mitad? Armá tu pizza
              </button>
            ) : null}

            <div className="flex items-center justify-between gap-4">
              <span className="text-[0.9375rem] font-semibold">Cantidad</span>
              <Stepper
                value={quantity}
                min={1}
                max={MAX_QUANTITY}
                itemLabel={product.name}
                disabled={!product.inStock}
                onIncrement={() => setQuantity((value) => Math.min(MAX_QUANTITY, value + 1))}
                onDecrement={() => setQuantity((value) => Math.max(1, value - 1))}
              />
            </div>

            <div>
              <label htmlFor="aclaracion-producto" className="text-[0.9375rem] font-semibold">
                Aclaración <span className="font-normal text-crema-muted">(opcional)</span>
              </label>
              <textarea
                id="aclaracion-producto"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                maxLength={NOTE_MAX_LENGTH}
                rows={2}
                placeholder="Ej.: sin aceitunas"
                enterKeyHint="done"
                className="mt-2 w-full resize-none rounded-xl bg-chapa px-3.5 py-3 text-[1rem] ring-1 ring-chapa-edge focus-visible:ring-0"
              />
              <p className="mt-1 text-right text-[0.8125rem] text-crema-muted">
                {note.length}/{NOTE_MAX_LENGTH}
              </p>
            </div>
          </>
        )}
      </div>
    </Sheet>
  )
}
