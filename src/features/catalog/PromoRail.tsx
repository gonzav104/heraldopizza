import type { Promotion } from '@/domain/catalog'
import { PricePill } from '@/components/ui/PricePill'
import { useOrderStore } from '@/features/cart/order-store'

interface PromoCardProps {
  promotion: Promotion
  /** Units of this promo already in the order. */
  quantity: number
  onAdd: () => void
}

/** A fixed combo with its own price (RN-13), added as a single order line (RF-12). */
export function PromoCard({ promotion, quantity, onAdd }: PromoCardProps) {
  return (
    <article className="flex h-full flex-col overflow-hidden rounded-2xl bg-heraldo text-white shadow-[0_16px_32px_-18px_rgb(215_25_31/0.85)]">
      {/* Promos may still carry a photo (RF-42); products do not (D5). */}
      {promotion.imageUrl ? (
        <img
          src={promotion.imageUrl}
          alt={promotion.title}
          loading="lazy"
          decoding="async"
          width={640}
          height={400}
          className="aspect-[16/10] w-full bg-chapa-high object-cover"
        />
      ) : null}
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="type-display text-[1.5rem]">{promotion.title}</h3>
        {promotion.description ? <p className="text-[0.9375rem] leading-snug">{promotion.description}</p> : null}
        <div className="mt-auto pt-2">
          <PricePill price={promotion.price} label="Precio de la promo" quantity={quantity} actionLabel={`Sumar ${promotion.title}`} onAdd={onAdd} />
        </div>
      </div>
    </article>
  )
}

/** Active promotions first (RF-10), swipeable on phones. Renders nothing without promotions. */
export function PromoRail({ promotions }: { promotions: Promotion[] }) {
  const lines = useOrderStore((state) => state.lines)
  const add = useOrderStore((state) => state.add)
  if (promotions.length === 0) return null

  return (
    <section id="promos" aria-labelledby="promos-titulo" className="scroll-mt-16 pt-9">
      <h2 id="promos-titulo" className="type-display px-4 text-[clamp(1.875rem,8.5vw,2.75rem)] sm:px-6 lg:px-0">
        Promos
      </h2>
      <ul className="mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pt-2 pb-2 [scrollbar-width:none] sm:px-6 lg:px-0">
        {promotions.map((promotion) => (
          <li key={promotion.id} className="w-[min(80vw,20rem)] shrink-0 snap-start">
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
