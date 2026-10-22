import { CircleAlert, Trash2 } from 'lucide-react'
import { useId, useState } from 'react'
import { formatArs } from '@/lib/money'
import { Stepper } from '@/components/ui/Stepper'
import type { LineIssue, OrderSummary, ResolvedLine } from './line-pricing'
import { NOTE_MAX_LENGTH } from './order-lines'
import { useOrderStore } from './order-store'

function NoteEditor({ lineId, note, onDone }: { lineId: string; note: string; onDone: () => void }) {
  const setNote = useOrderStore((state) => state.setNote)
  const [draft, setDraft] = useState(note)
  const commit = () => {
    setNote(lineId, draft)
    onDone()
  }

  return (
    <div className="mt-2">
      <label htmlFor={`nota-${lineId}`} className="sr-only">
        Aclaración
      </label>
      <textarea
        id={`nota-${lineId}`}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        maxLength={NOTE_MAX_LENGTH}
        rows={2}
        placeholder="Ej.: sin aceitunas"
        enterKeyHint="done"
        // The field opens on request, so focus moves into it.
        autoFocus
        className="w-full resize-none rounded-xl bg-chapa px-3.5 py-2.5 text-[1rem] ring-1 ring-chapa-edge focus-visible:ring-0"
      />
      <div className="mt-1 flex justify-end">
        <button
          type="button"
          onClick={commit}
          className="min-h-11 rounded-xl px-4 text-[0.9375rem] font-bold text-mostaza transition-colors hover:bg-chapa-edge"
        >
          Guardar aclaración
        </button>
      </div>
    </div>
  )
}

const COLLAPSE_MS = 200

function prefersReducedMotion(): boolean {
  // Without matchMedia (tests, old browsers), skip the animation.
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? true
}

function CartLine({ item }: { item: ResolvedLine }) {
  const increment = useOrderStore((state) => state.increment)
  const decrement = useOrderStore((state) => state.decrement)
  const remove = useOrderStore((state) => state.remove)
  const [editing, setEditing] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const { line } = item
  const name = item.detail ? `${item.title} (${item.detail})` : item.title

  // The line folds away (height and opacity) before it leaves the order.
  const leave = (action: () => void) => {
    if (prefersReducedMotion()) return action()
    setLeaving(true)
    window.setTimeout(action, COLLAPSE_MS)
  }

  return (
    <li
      aria-hidden={leaving || undefined}
      className={`grid transition-[grid-template-rows,opacity] duration-200 ease-[var(--ease-out-soft)] ${
        leaving ? 'grid-rows-[0fr] opacity-0' : 'grid-rows-[1fr] opacity-100'
      }`}
    >
      <div className="min-h-0 overflow-hidden">
        <div className="border-b border-chapa-edge py-3.5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="leading-tight font-bold [font-stretch:104%]">{item.title}</p>
              {item.detail ? <p className="text-[0.875rem] text-crema-muted">{item.detail}</p> : null}
              {item.parts.length > 0 ? (
                <ul aria-label="Gustos" className="mt-1 text-[0.875rem] leading-snug">
                  {item.parts.map((part) => (
                    <li key={part}>{part}</li>
                  ))}
                </ul>
              ) : null}
              {line.note && !editing ? (
                <p className="mt-1 text-[0.875rem] leading-snug">
                  <span className="text-crema-muted">Aclaración:</span> {line.note}
                </p>
              ) : null}
              {editing ? null : (
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="-ml-1 inline-flex min-h-11 items-center px-1 text-[0.875rem] font-semibold text-mostaza underline-offset-4 hover:underline"
                >
                  {line.note ? 'Editar aclaración' : 'Agregar aclaración'}
                </button>
              )}
            </div>
            <p className="type-price shrink-0 text-[1.0625rem]">{formatArs(item.subtotal)}</p>
          </div>

          {editing ? <NoteEditor lineId={line.id} note={line.note} onDone={() => setEditing(false)} /> : null}

          <div className="mt-1 flex items-center justify-between gap-2">
            <Stepper
              value={line.quantity}
              itemLabel={name}
              disabled={leaving}
              onIncrement={() => increment(line.id)}
              onDecrement={() => (line.quantity === 1 ? leave(() => decrement(line.id)) : decrement(line.id))}
            />
            <button
              type="button"
              onClick={() => leave(() => remove(line.id))}
              disabled={leaving}
              aria-label={`Quitar ${name} del pedido`}
              className="grid size-11 place-items-center rounded-xl text-crema-muted transition-colors hover:bg-chapa-edge hover:text-crema"
            >
              <Trash2 aria-hidden="true" className="size-5" />
            </button>
          </div>
        </div>
      </div>
    </li>
  )
}

/** The order's lines with quantity, note, and subtotal per line (RF-16). Shared by the cart sheet and the desktop panel. */
export function CartLines({ summary }: { summary: OrderSummary }) {
  return (
    <ul>
      {summary.lines.map((item) => (
        <CartLine key={item.line.id} item={item} />
      ))}
    </ul>
  )
}

/**
 * Lines the current catalog cannot price (P2): named as far as the catalog still allows, with the reason, no price, and
 * only «Quitar». They stay in the order, and return to the priced lines on their own if the catalog has them back.
 */
export function OrderIssues({ issues }: { issues: LineIssue[] }) {
  const remove = useOrderStore((state) => state.remove)
  const headingId = useId()
  if (issues.length === 0) return null

  return (
    <section aria-labelledby={headingId} className="mt-4 rounded-2xl bg-chapa px-4 pt-3.5 pb-1 ring-1 ring-mostaza/70">
      <h3 id={headingId} className="flex items-center gap-2 font-bold text-mostaza">
        <CircleAlert aria-hidden="true" className="size-5 shrink-0" strokeWidth={2.5} />
        Revisá estos productos
      </h3>
      <p className="mt-1 text-[0.875rem] leading-snug text-crema-muted">No se pueden pedir así. Quitalos para continuar.</p>
      <ul>
        {issues.map(({ line, title, detail, reason }) => (
          <li key={line.id} className="flex items-start justify-between gap-3 border-b border-chapa-edge py-3 last:border-b-0">
            <div className="min-w-0">
              <p className="leading-tight font-bold [font-stretch:104%]">{title}</p>
              {detail ? <p className="text-[0.875rem] text-crema-muted">{detail}</p> : null}
              <p className="mt-1 text-[0.875rem] leading-snug font-semibold text-mostaza">{reason}</p>
              {line.note ? (
                <p className="mt-1 text-[0.875rem] leading-snug">
                  <span className="text-crema-muted">Aclaración:</span> {line.note}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => remove(line.id)}
              aria-label={`Quitar ${title} del pedido`}
              className="grid size-11 shrink-0 place-items-center rounded-xl text-crema-muted transition-colors hover:bg-chapa-edge hover:text-crema"
            >
              <Trash2 aria-hidden="true" className="size-5" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}

/** Shown above the disabled «Continuar» while there are lines to review. */
export function CheckoutBlockedNote() {
  return <p className="text-center text-[0.875rem] font-semibold text-mostaza">Quitá los productos marcados para continuar.</p>
}

export function EmptyOrder() {
  return <p className="py-6 text-[1rem] leading-snug text-crema-muted">Tu pedido está vacío. Sumá productos desde la carta.</p>
}

export function ProductsSubtotal({ amount }: { amount: number }) {
  return (
    <p className="flex items-baseline justify-between gap-3">
      <span className="font-semibold">Productos</span>
      <span className="type-price text-[1.25rem]">{formatArs(amount)}</span>
    </p>
  )
}
