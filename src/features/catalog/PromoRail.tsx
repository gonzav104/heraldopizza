import { CupSoda, Pizza, Plus } from 'lucide-react'
import { useId, type ReactNode } from 'react'
import { EmpanadaIcon } from '@/components/ui/EmpanadaIcon'
import type { Promotion } from '@/domain/catalog'
import { PricePill } from '@/components/ui/PricePill'
import { useOrderStore } from '@/features/cart/order-store'
import { comboParts, type ComboItemKind, type ComboPart } from '@/features/catalog/combo-parts'

interface PromoCardProps {
  promotion: Promotion
  /** Units of this promo already in the order. */
  quantity: number
  onAdd: () => void
}

const KIND_ICONS: Record<ComboItemKind, (props: { className?: string; strokeWidth?: number }) => ReactNode> = {
  pizza: (props) => <Pizza {...props} />,
  empanada: (props) => <EmpanadaIcon {...props} />,
  drink: (props) => <CupSoda {...props} />,
}

/** A pine token with what the part is; a part that states several («6 empanadas», «Tres pizzas») becomes a pile. */
function PartToken({ part }: { part: ComboPart }) {
  const Icon = part.kind ? KIND_ICONS[part.kind] : null
  const pile = (part.count ?? 1) > 1
  return (
    <span aria-hidden="true" className="relative grid size-11 shrink-0 place-items-center">
      {pile ? (
        <>
          <span className="texture-pino absolute inset-0 translate-x-2 -translate-y-1 rounded-full opacity-55 shadow-[0_3px_8px_rgb(0_0_0/0.45)]" />
          <span className="texture-pino absolute inset-0 translate-x-1 -translate-y-0.5 rounded-full opacity-80 shadow-[0_3px_8px_rgb(0_0_0/0.45)]" />
        </>
      ) : null}
      <span className="texture-pino relative grid size-11 place-items-center rounded-full text-pino-ink shadow-[0_4px_10px_rgb(0_0_0/0.5),inset_0_1px_0_rgb(255_255_255/0.45)]">
        {Icon ? Icon({ className: 'size-6', strokeWidth: 2.25 }) : <span className="size-2 rounded-full bg-pino-ink" />}
      </span>
    </span>
  )
}

/**
 * A fixed combo with its own price (RN-13), added as a single order line (RF-12). Heraldo red with the faint ribs of
 * the corrugated sheet and a warm light from the corner. Each part of the combo gets a pine token that shows what it
 * is (pizza, empanada, drink), read from the promo's own words, chained to the next by a mustard plus; the first
 * part's picture sits large and faint behind, for depth. The price is the protagonist, on a pine board like the
 * counter, where the add control lives.
 */
export function PromoCard({ promotion, quantity, onAdd }: PromoCardProps) {
  const titleId = useId()
  const parts = comboParts(promotion.title)
  const backdropKind = parts.find((part) => part.kind)?.kind
  return (
    <article
      aria-labelledby={titleId}
      className="relative isolate flex h-full flex-col overflow-hidden rounded-2xl bg-heraldo text-white shadow-[0_18px_34px_-20px_rgb(215_25_31/0.9),inset_0_1px_0_rgb(255_255_255/0.22)]"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(130%_90%_at_0%_0%,rgb(255_196_120/0.24),transparent_55%),repeating-linear-gradient(90deg,transparent_0_9px,rgb(255_255_255/0.05)_11px,rgb(0_0_0/0.08)_14px,transparent_17px)]"
      />
      {backdropKind ? (
        <span aria-hidden="true" className="pointer-events-none absolute -top-5 -right-7 -z-10 rotate-[-14deg] text-white/12">
          {KIND_ICONS[backdropKind]({ className: 'size-36', strokeWidth: 1.5 })}
        </span>
      ) : null}
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
          className="aspect-[16/10] w-full bg-chapa-high object-cover"
        />
      ) : null}
      <div className="flex flex-1 flex-col gap-3 px-4 pt-4 pb-3">
        <ul className="flex flex-col gap-2.5">
          {parts.map((part, index) => (
            <li key={`${index}-${part.text}`} className="relative flex items-center gap-3">
              {index > 0 ? (
                <span
                  aria-hidden="true"
                  className="absolute -top-[1.0625rem] left-[0.8125rem] z-10 grid size-[1.125rem] place-items-center rounded-full bg-mostaza text-chapa shadow-[0_1px_3px_rgb(0_0_0/0.5)]"
                >
                  <Plus className="size-3" strokeWidth={3.5} />
                </span>
              ) : null}
              <PartToken part={part} />
              <span className="type-display text-[clamp(1.125rem,5vw,1.375rem)] leading-[1.05] text-balance">{part.text}</span>
            </li>
          ))}
        </ul>
        {promotion.description ? <p className="text-[0.9375rem] leading-snug text-white/90">{promotion.description}</p> : null}
      </div>
      <div className="texture-pino mt-auto px-3 py-3 shadow-[inset_0_1px_0_rgb(255_255_255/0.35),inset_0_8px_14px_-10px_rgb(0_0_0/0.6)]">
        <PricePill price={promotion.price} size="lg" quantity={quantity} actionLabel={`Sumar ${promotion.title}`} onAdd={onAdd} />
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
        <p className="pb-1 text-right text-[clamp(0.8125rem,3.6vw,0.9375rem)] whitespace-nowrap text-crema-muted">
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
