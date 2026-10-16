import { Trash2 } from 'lucide-react'
import { useState } from 'react'
import { formatArs } from '@/lib/money'
import { Stepper } from '@/components/ui/Stepper'
import type { OrderSummary, ResolvedLine } from './line-pricing'
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
