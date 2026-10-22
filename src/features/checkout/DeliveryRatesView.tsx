import { Search } from 'lucide-react'
import { useState } from 'react'
import { deliveryRateGroups } from '@/data/delivery-rates'
import { formatArs } from '@/lib/money'
import { searchDeliveryRates } from './delivery-rates'
import { DELIVERY_RATES_NOTE } from './notices'

/**
 * «Tarifas de la motito»: the owner's official list, for reference only, with a search by name. It opens as its own
 * view inside the order sheet («Consultar tarifas de reparto»), so the details form stays short on a phone. Barrios
 * and fábricas stay apart: a name such as Siderca is in both, with different prices.
 */
export function DeliveryRatesView() {
  const [query, setQuery] = useState('')
  const groups = searchDeliveryRates(deliveryRateGroups, query)
  const count = groups.reduce((total, group) => total + group.tiers.reduce((sum, tier) => sum + tier.places.length, 0), 0)

  return (
    <div className="flex flex-col gap-5 p-5 sm:p-6">
      <p className="text-[0.9375rem] leading-snug text-crema-muted">
        El reparto en motito se paga aparte, según el destino, y no se suma al total del pedido.
      </p>

      <div className="relative">
        <label htmlFor="tarifas-busqueda" className="sr-only">
          Buscá un barrio, localidad o fábrica
        </label>
        <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-crema-muted" />
        <input
          id="tarifas-busqueda"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscá un barrio, localidad o fábrica"
          enterKeyHint="search"
          autoComplete="off"
          className="min-h-12 w-full rounded-xl bg-chapa pr-3.5 pl-11 text-[1rem] ring-1 ring-chapa-edge focus-visible:ring-0"
        />
      </div>
      <p aria-live="polite" className="sr-only">
        {query.trim() ? `${count} ${count === 1 ? 'resultado' : 'resultados'}` : ''}
      </p>

      {groups.length === 0 ? (
        <p className="rounded-xl bg-chapa p-4 text-[0.9375rem] leading-snug ring-1 ring-chapa-edge">
          No encontramos «{query.trim()}» en la lista. Consultá la tarifa al local.
        </p>
      ) : null}

      {groups.map((group) => (
        <section key={group.id} aria-labelledby={`tarifas-${group.id}`}>
          <h3 id={`tarifas-${group.id}`} className="text-[1.0625rem] font-bold">
            {group.title}
          </h3>
          <ul className="mt-1">
            {group.tiers.map((tier) => (
              <li key={tier.price} className="flex items-baseline justify-between gap-4 border-b border-chapa-edge py-2.5 last:border-b-0">
                <p className="min-w-0 text-[0.9375rem] leading-snug">{tier.places.join(', ')}</p>
                <p className="type-price shrink-0 text-[1.0625rem]">{formatArs(tier.price)}</p>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <p className="text-[0.875rem] leading-snug text-crema-muted">{DELIVERY_RATES_NOTE}</p>
    </div>
  )
}
