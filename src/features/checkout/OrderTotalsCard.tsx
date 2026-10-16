import type { ReactNode } from 'react'
import { formatArs } from '@/lib/money'
import { CREDIT_SURCHARGE_PERCENT, type OrderTotals } from './prototype-order'

function Row({ label, children, strong = false }: { label: string; children: ReactNode; strong?: boolean }) {
  return (
    <div className={`flex items-baseline justify-between gap-3 ${strong ? 'mt-1 border-t border-pino-ink/25 pt-2.5' : ''}`}>
      <dt className={strong ? 'text-[1.0625rem] font-[800]' : 'font-semibold'}>{label}</dt>
      <dd className={`type-price ${strong ? 'text-[1.375rem]' : 'text-[1.0625rem]'}`}>{children}</dd>
    </div>
  )
}

/**
 * The order summary on the pine counter: products, delivery charges, credit surcharge, and the
 * orientative total (RN-03, RN-04, RN-15, RN-17).
 */
export function OrderTotalsCard({ totals }: { totals: OrderTotals }) {
  return (
    <section aria-labelledby="resumen-titulo" className="texture-pino rounded-2xl p-4 text-pino-ink shadow-[inset_0_1px_0_rgb(255_255_255/0.35),0_10px_24px_-14px_rgb(0_0_0/0.9)]">
      <h3 id="resumen-titulo" className="sr-only">
        Resumen del pedido
      </h3>
      <dl className="flex flex-col gap-1.5">
        <Row label="Productos">{formatArs(totals.products)}</Row>
        {totals.pizzaSurcharge ? (
          <Row label={`Recargo por pizza (${totals.pizzaSurcharge.count} × ${formatArs(totals.pizzaSurcharge.unit)})`}>
            {formatArs(totals.pizzaSurcharge.amount)}
          </Row>
        ) : null}
        {totals.shippingToConfirm ? <Row label="Envío">a confirmar</Row> : null}
        {totals.creditSurcharge !== null ? (
          <Row label={`Recargo crédito ${CREDIT_SURCHARGE_PERCENT} %`}>{formatArs(totals.creditSurcharge)}</Row>
        ) : null}
        <Row label="Total orientativo" strong>
          {formatArs(totals.total)}
        </Row>
      </dl>
      <p className="mt-2 text-[0.875rem] font-semibold">El local confirma el total por WhatsApp.</p>
    </section>
  )
}
