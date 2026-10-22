import type { ReactNode } from 'react'
import { totalsSummary, type OrderTotals } from './prototype-order'

function Row({ label, children, strong = false }: { label: string; children: ReactNode; strong?: boolean }) {
  return (
    <div className={`flex items-baseline justify-between gap-3 ${strong ? 'mt-1 border-t border-pino-ink/25 pt-2.5' : ''}`}>
      <dt className={strong ? 'text-[1.0625rem] font-[800]' : 'font-semibold'}>{label}</dt>
      {/* The amount, or «A confirmar», never wraps: the label takes the second line instead. */}
      <dd className={`type-price shrink-0 whitespace-nowrap ${strong ? 'text-[1.375rem]' : 'text-[1.0625rem]'}`}>{children}</dd>
    </div>
  )
}

/**
 * The order summary on the pine counter (RN-03, RN-04, RN-15, RN-17). Its rows, total, and notes come from
 * `totalsSummary`, the same ones the WhatsApp message writes; anything still to confirm makes the total «Total parcial».
 */
export function OrderTotalsCard({ totals }: { totals: OrderTotals }) {
  const summary = totalsSummary(totals)
  return (
    <section aria-labelledby="resumen-titulo" className="texture-pino rounded-2xl p-4 text-pino-ink shadow-[inset_0_1px_0_rgb(255_255_255/0.35),0_10px_24px_-14px_rgb(0_0_0/0.9)]">
      <h3 id="resumen-titulo" className="sr-only">
        Resumen del pedido
      </h3>
      <dl className="flex flex-col gap-1.5">
        {summary.rows.map((row) => (
          <Row key={row.label} label={row.label}>
            {row.value}
          </Row>
        ))}
        <Row label={summary.total.label} strong>
          {summary.total.value}
        </Row>
      </dl>
      {summary.notes.map((note) => (
        <p key={note} className="mt-2 text-[0.875rem] font-semibold">
          {note}
        </p>
      ))}
    </section>
  )
}
