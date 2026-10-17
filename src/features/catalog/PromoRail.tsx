import { Plus } from 'lucide-react'
import { useId } from 'react'
import type { Promotion } from '@/domain/catalog'
import { PricePill } from '@/components/ui/PricePill'
import { useOrderStore } from '@/features/cart/order-store'

interface PromoCardProps {
  promotion: Promotion
  /** Units of this promo already in the order. */
  quantity: number
  onAdd: () => void
}

/** A combo title split into its parts («Muzza + 6 empanadas surtidas» → two lines), so it scans at a glance. */
function comboParts(title: string): string[] {
  return title.split(' + ').map((part) => part.trim()).filter(Boolean)
}

/**
 * A fixed combo with its own price (RN-13), added as a single order line (RF-12). Heraldo red with the faint ribs of
 * the corrugated sheet, each part of the combo on its own line joined by a mustard plus, and the price on a pine
 * board, like the counter, where the add control lives.
 */
export function PromoCard({ promotion, quantity, onAdd }: PromoCardProps) {
  const titleId = useId()
  const parts = comboParts(promotion.title)
  return (
    <article
      aria-labelledby={titleId}
      className="relative flex h-full flex-col overflow-hidden rounded-2xl bg-heraldo text-white shadow-[0_18px_34px_-20px_rgb(215_25_31/0.9)]"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(90deg,transparent_0_9px,rgb(255_255_255/0.05)_11px,rgb(0_0_0/0.08)_14px,transparent_17px)]"
      />
      <h3 id={titleId} className="sr-only">
        {promotion.title}
      </h3>
      {/* Promos may still carry a photo (RF-42); products do not (D5). */}
      {promotion.imageUrl ? (
        <img
          src={promotion.imageUrl}
          alt=""
          loading="lazy"
          decoding="async"
          width={640}
          height={400}
          className="relative aspect-[16/10] w-full bg-chapa-high object-cover"
        />
      ) : null}
      <div className="relative flex flex-1 flex-col gap-3 px-4 pt-4 pb-3">
        <ul className="flex flex-col gap-1.5">
          {parts.map((part, index) => (
            <li key={part} className="flex items-center gap-2.5">
              {index > 0 ? (
                <span aria-hidden="true" className="grid size-6 shrink-0 place-items-center rounded-full bg-mostaza text-chapa">
                  <Plus className="size-4" strokeWidth={3} />
                </span>
              ) : null}
              <span className="type-display text-[clamp(1.25rem,5.6vw,1.5rem)] leading-[1.05] text-balance">{part}</span>
            </li>
          ))}
        </ul>
        {promotion.description ? <p className="text-[0.9375rem] leading-snug text-white/90">{promotion.description}</p> : null}
      </div>
      <div className="texture-pino relative mt-auto px-3 py-3 shadow-[inset_0_1px_0_rgb(255_255_255/0.35)]">
        <PricePill price={promotion.price} label="Precio de la promo" quantity={quantity} actionLabel={`Sumar ${promotion.title}`} onAdd={onAdd} />
      </div>
    </article>
  )
}

/**
 * Active promotions first (RF-10): one swipeable row at every width, so the section never pushes the menu far down.
 * Renders nothing without promotions.
 */
export function PromoRail({ promotions }: { promotions: Promotion[] }) {
  const lines = useOrderStore((state) => state.lines)
  const add = useOrderStore((state) => state.add)
  if (promotions.length === 0) return null

  return (
    <section id="promos" aria-labelledby="promos-titulo" className="scroll-mt-16 pt-9">
      <div className="flex items-end justify-between gap-3 px-4 sm:px-6 lg:px-0">
        <h2 id="promos-titulo" className="type-display text-[clamp(1.875rem,8.5vw,2.75rem)]">
          Promos
        </h2>
        <p className="pb-1 text-right text-[0.9375rem] text-crema-muted">
          {promotions.length} combos con precio propio
        </p>
      </div>
      <ul className="mt-3 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pt-2 pb-3 [scrollbar-color:var(--color-chapa-edge)_transparent] [scrollbar-width:none] sm:scroll-px-6 sm:px-6 lg:scroll-px-0 lg:px-0 lg:pb-4 lg:[scrollbar-width:thin]">
        {promotions.map((promotion) => (
          <li key={promotion.id} className="w-[min(78vw,19rem)] shrink-0 snap-start">
            <PromoCard
              promotion={promotion}
              quantity={lines.reduce((total, line) => (line.kind === 'promotion' && line.promotionId === promotion.id ? total + line.quantity : total), 0)}
              onAdd={() => add({ kind: 'promotion', promotionId: promotion.id, quantity: 1, note: '' })}
            />
          </li>
        ))}
      </ul>
    </section>
  )
}
