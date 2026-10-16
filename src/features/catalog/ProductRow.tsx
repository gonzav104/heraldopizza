import { useId } from 'react'
import type { Ars, Product, Variant } from '@/domain/catalog'
import { hasOrderablePrice } from '@/domain/catalog'
import { Badge } from '@/components/ui/Badge'
import { PricePill } from '@/components/ui/PricePill'
import { useVariantQuantity } from '@/features/cart/useOrderSummary'
import { useOrderStore } from '@/features/cart/order-store'
import { formatArs } from '@/lib/money'
import { ProductName } from './ProductName'
import { madeToOrderDetail, orderableVariants, visibleVariantName, wholeHalfVariants } from './presentation'

interface RowProps {
  product: Product
  onOpen: (product: Product) => void
}

/**
 * Name, description, and states. The name and description form one button (≥ 44 px) that opens the product sheet;
 * its accessible name is the product name, and the description is its description.
 */
function RowInfo({ product, onOpen, compact = false }: RowProps & { compact?: boolean }) {
  const nameId = useId()
  const descriptionId = useId()

  return (
    <div className="min-w-0 flex-1">
      <h3 className={`leading-tight font-bold [font-stretch:106%] ${compact ? 'text-[1.0625rem]' : 'text-[1.125rem]'}`}>
        <button
          type="button"
          onClick={() => onOpen(product)}
          aria-haspopup="dialog"
          aria-labelledby={nameId}
          aria-describedby={product.description ? descriptionId : undefined}
          className="flex min-h-11 w-full flex-col justify-center rounded-lg text-left"
        >
          <span id={nameId}>
            <ProductName name={product.name} />
          </span>
          {product.description ? (
            <span id={descriptionId} className="mt-1 text-[0.9375rem] leading-snug font-normal text-crema-muted [font-stretch:100%]">
              {product.description}
            </span>
          ) : null}
        </button>
      </h3>
      <ProductStates product={product} />
    </div>
  )
}

/** Out of stock (RF-05) and made to order (RF-06). */
export function ProductStates({ product }: { product: Product }) {
  if (product.inStock && !product.madeToOrderNotice) return null
  return (
    <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.875rem] leading-snug">
      {!product.inStock ? <Badge tone="out-of-stock">Sin stock</Badge> : null}
      {product.madeToOrderNotice ? (
        <>
          <Badge tone="made-to-order">Por encargo</Badge>
          <span className="text-crema-muted">{madeToOrderDetail(product.madeToOrderNotice)}</span>
        </>
      ) : null}
    </p>
  )
}

function VariantPill({ product, variant, showLabel }: { product: Product; variant: Variant & { price: Ars }; showLabel: boolean }) {
  const add = useOrderStore((state) => state.add)
  const quantity = useVariantQuantity(product.id, variant.id)
  const label = showLabel ? visibleVariantName(variant.name, product.variants.length) : undefined

  return (
    <PricePill
      price={variant.price}
      label={label}
      quantity={quantity}
      disabled={!product.inStock}
      actionLabel={label ? `Sumar ${product.name}, ${label}` : `Sumar ${product.name}`}
      onAdd={() => add({ kind: 'product', productId: product.id, variantId: variant.id, quantity: 1, note: '' })}
    />
  )
}

/** A half circle: the left half filled red, the right half a dashed outline (same language as the configurator). */
function HalfGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5 shrink-0">
      <path d="M11 3a9 9 0 0 0 0 18Z" fill="var(--color-heraldo)" />
      <path d="M13 3a9 9 0 0 1 0 18" fill="none" stroke="currentColor" strokeWidth={2} strokeDasharray="3 3" />
    </svg>
  )
}

/**
 * Secondary control for the half price (RF-60 keeps it visible). It does not add: it opens "Armá tu pizza"
 * with this flavor as the first half (D1, D2).
 */
function HalfBuilderPill({ product, price, onBuild }: { product: Product; price: Ars; onBuild: (product: Product) => void }) {
  return (
    <button
      type="button"
      onClick={() => onBuild(product)}
      disabled={!product.inStock}
      aria-haspopup="dialog"
      aria-label={`Armar media pizza o mitad y mitad con ${product.name}, media ${formatArs(price)}`}
      className="flex min-h-12 w-full min-w-0 items-center gap-2 rounded-xl px-3 py-1.5 text-left text-crema-muted ring-1 ring-chapa-edge ring-inset transition-[box-shadow,color] duration-150 hover:text-crema hover:ring-crema-muted/60 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:ring-chapa-edge"
    >
      <span className="flex min-w-0 flex-1 flex-col leading-tight">
        <span className="text-[0.8125rem]">Media</span>
        <span className="type-price text-[1.0625rem] whitespace-nowrap text-crema">{formatArs(price)}</span>
      </span>
      <HalfGlyph />
    </button>
  )
}

/** RN-01: no published price, no add control. */
function AskAtBar() {
  return <p className="text-[0.9375rem] font-semibold text-mostaza">Consultar en barra</p>
}

/** Variants with long names stack one per line on phones. */
function pillGrid(variants: Variant[]): string {
  return variants.some((variant) => variant.name.length > 10) ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-2'
}

/**
 * Pizza row (RF-60): whole and half prices on the same row. The whole price adds one pizza with a tap (D1);
 * the half price opens "Armá tu pizza".
 */
export function PizzaRow({ product, onOpen, onBuild }: RowProps & { onBuild: (product: Product) => void }) {
  const { whole, half } = wholeHalfVariants(product)
  const wholeOrderable = whole && hasOrderablePrice(whole) ? whole : undefined
  const halfOrderable = half && hasOrderablePrice(half) ? half : undefined

  return (
    <li className="flex flex-col border-b border-chapa-edge py-4">
      <RowInfo product={product} onOpen={onOpen} />
      {wholeOrderable || halfOrderable ? (
        <div className="mt-auto grid grid-cols-2 gap-2 pt-3">
          {wholeOrderable ? <VariantPill product={product} variant={wholeOrderable} showLabel /> : null}
          {halfOrderable ? <HalfBuilderPill product={product} price={halfOrderable.price} onBuild={onBuild} /> : null}
        </div>
      ) : (
        <div className="mt-auto pt-2">
          <AskAtBar />
        </div>
      )}
    </li>
  )
}

/** Generic row: description, states, and one pill per orderable variant. */
export function ProductRow({ product, onOpen }: RowProps) {
  const variants = orderableVariants(product)

  return (
    <li className="flex flex-col border-b border-chapa-edge py-4">
      <RowInfo product={product} onOpen={onOpen} />
      {variants.length > 0 ? (
        <div className={`mt-auto grid gap-2 pt-3 ${pillGrid(variants)}`}>
          {variants.map((variant) => (
            <VariantPill key={variant.id} product={product} variant={variant} showLabel />
          ))}
        </div>
      ) : (
        <div className="mt-auto pt-2">
          <AskAtBar />
        </div>
      )}
      {variants.length > 0 && variants.length < product.variants.length ? (
        <p className="mt-2 text-[0.875rem] text-crema-muted">Otras opciones: consultar en barra.</p>
      ) : null}
    </li>
  )
}

/** Compact row for short items without description (drinks, coffee, desserts): one line, price on the right. */
export function CompactRow({ product, onOpen }: RowProps) {
  const variants = orderableVariants(product)
  const single = variants.length === 1 && product.variants.length === 1

  return (
    <li className="border-b border-chapa-edge py-2.5">
      <div className="flex min-h-12 items-center gap-3">
        <RowInfo product={product} onOpen={onOpen} compact />
        {variants.length === 0 ? <AskAtBar /> : null}
        {single ? (
          <div className="w-34 shrink-0">
            <VariantPill product={product} variant={variants[0]} showLabel />
          </div>
        ) : null}
      </div>
      {variants.length > 0 && !single ? (
        <div className={`mt-2 grid gap-2 ${pillGrid(variants)}`}>
          {variants.map((variant) => (
            <VariantPill key={variant.id} product={product} variant={variant} showLabel />
          ))}
        </div>
      ) : null}
    </li>
  )
}
