import type { Product } from '@/domain/catalog'
import { Stepper } from '@/components/ui/Stepper'
import { formatArs } from '@/lib/money'
import { useOrderStore } from '@/features/cart/order-store'
import { usePlainLine } from '@/features/cart/useOrderSummary'
import { ProductStates } from './ProductRow'
import { boardLabel } from './presentation'

interface FlavorBoardProps {
  items: Product[]
  prefix: string
  onOpen: (product: Product) => void
}

function FlavorRow({ product, prefix, onOpen }: { product: Product; prefix: string; onOpen: (product: Product) => void }) {
  const variant = product.variants[0]
  const line = usePlainLine(product.id, variant.id)
  const add = useOrderStore((state) => state.add)
  const increment = useOrderStore((state) => state.increment)
  const decrement = useOrderStore((state) => state.decrement)
  const label = boardLabel(product.name, prefix)

  return (
    <li className="flex min-h-15 items-center gap-3 border-b border-chapa-edge py-2">
      <div className="min-w-0 flex-1">
        <h3 className="text-[1.0625rem] leading-tight font-bold [font-stretch:106%]">
          <button
            type="button"
            onClick={() => onOpen(product)}
            aria-haspopup="dialog"
            aria-label={product.name}
            className="flex min-h-11 w-full items-center rounded-lg text-left"
          >
            {label}
          </button>
        </h3>
        <ProductStates product={product} />
      </div>
      <Stepper
        value={line?.quantity ?? 0}
        itemLabel={product.name}
        collapseAtZero
        disabled={!product.inStock}
        onIncrement={() =>
          line ? increment(line.id) : add({ kind: 'product', productId: product.id, variantId: variant.id, quantity: 1, note: '' })
        }
        onDecrement={() => {
          if (line) decrement(line.id)
        }}
      />
    </li>
  )
}

/** Same-price flavors (RF-61): one row per flavor with its own quantity, priced once in the header. */
export function FlavorBoard({ items, prefix, onOpen }: FlavorBoardProps) {
  const price = items[0]?.variants[0].price
  if (price === null || price === undefined) return null

  return (
    <div>
      <p className="text-[0.9375rem] text-crema-muted">
        <span className="type-price text-[1.0625rem] text-mostaza">{formatArs(price)}</span> cada una. Elegí gusto y cantidad.
      </p>
      <ul className="mt-2 grid gap-x-8 md:grid-cols-2">
        {items.map((product) => (
          <FlavorRow key={product.id} product={product} prefix={prefix} onOpen={onOpen} />
        ))}
      </ul>
    </div>
  )
}
