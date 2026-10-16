import { Plus } from 'lucide-react'
import type { Ars } from '@/domain/catalog'
import { formatArs } from '@/lib/money'

interface PricePillProps {
  price: Ars
  /** Visible variant name ("Entera"); omitted for single "Unidad" items. */
  label?: string
  /** Units of this variant already in the order; shown as a mustard badge. */
  quantity: number
  onAdd: () => void
  /** Full action for assistive tech: "Sumar Muzzarella, entera". */
  actionLabel: string
  disabled?: boolean
  className?: string
}

/** One-tap add for one orderable variant (quick add). */
export function PricePill({ price, label, quantity, onAdd, actionLabel, disabled = false, className = '' }: PricePillProps) {
  const inOrder = quantity > 0 ? `, ${quantity} en tu pedido` : ''

  return (
    <button
      type="button"
      onClick={onAdd}
      disabled={disabled}
      aria-label={`${actionLabel}, ${formatArs(price)}${inOrder}`}
      className={`group relative flex min-h-12 w-full min-w-0 items-center gap-2 rounded-xl bg-chapa-high py-1.5 pr-1.5 pl-3 text-left ring-1 ring-chapa-edge transition-[box-shadow,transform,background-color] duration-150 hover:ring-crema-muted/60 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:ring-chapa-edge disabled:active:scale-100 motion-reduce:active:scale-100 ${className}`}
    >
      <span className="flex min-w-0 flex-1 flex-col leading-tight">
        {label ? <span className="truncate text-[0.8125rem] text-crema-muted">{label}</span> : null}
        <span className="type-price text-[1.0625rem] whitespace-nowrap text-crema">{formatArs(price)}</span>
      </span>
      <span
        aria-hidden="true"
        className="grid size-9 shrink-0 place-items-center rounded-lg bg-heraldo text-white transition-colors group-hover:bg-heraldo-deep group-disabled:bg-chapa-edge"
      >
        <Plus className="size-5" strokeWidth={2.75} />
      </span>
      {quantity > 0 ? (
        <span
          key={quantity}
          aria-hidden="true"
          className="type-price absolute -top-2 -right-1.5 grid h-6 min-w-6 place-items-center rounded-full bg-mostaza px-1.5 text-[0.8125rem] text-pino-ink shadow-[0_2px_6px_rgb(0_0_0/0.5)] motion-safe:animate-[count-pop_320ms_var(--ease-out-expo)]"
        >
          {quantity}
        </span>
      ) : null}
    </button>
  )
}
