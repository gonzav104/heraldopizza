import { X } from 'lucide-react'
import { useState } from 'react'
import type { Product } from '@/domain/catalog'
import { PrimaryAction } from '@/components/ui/PrimaryAction'
import { formatArs } from '@/lib/money'
import { Sheet } from '@/components/ui/Sheet'
import { Stepper } from '@/components/ui/Stepper'
import { useSheetContent } from '@/components/ui/useSheetHistory'
import { NOTE_MAX_LENGTH } from '@/features/cart/order-lines'
import { useOrderStore } from '@/features/cart/order-store'
import { SplitPizzaDiagram } from './SplitPizzaDiagram'
import {
  assignFlavor,
  buildPizzaLine,
  builderMode,
  builderPrice,
  clearSlot,
  initBuilder,
  isTakenByOtherSlot,
  modeLabels,
  selectSlot,
  type BuilderState,
  type Slot,
} from './pizza-builder'
import { halfPrice } from './presentation'

const MAX_QUANTITY = 20
const TITLE_ID = 'armar-pizza-titulo'

const slotNames: Record<Slot, string> = { first: '1ª mitad', second: '2ª mitad' }

const modeStyles = {
  empty: 'text-crema-muted ring-1 ring-chapa-edge',
  media: 'bg-heraldo text-white',
  mitad: 'bg-mostaza text-pino-ink',
}

interface BuilderViewProps {
  state: BuilderState
  candidates: Product[]
  onChange: (state: BuilderState) => void
}

function SlotButton({ slot, state, candidates, onChange }: BuilderViewProps & { slot: Slot }) {
  const productId = state[slot]
  const name = candidates.find((product) => product.id === productId)?.name
  const active = state.active === slot
  const locked = slot === 'second' && !state.first
  const activeRing = slot === 'first' ? 'ring-2 ring-heraldo' : 'ring-2 ring-mostaza'
  const prompt = locked ? 'Primero la 1ª' : slot === 'first' ? 'Elegí un gusto' : 'Sumá otro gusto'

  return (
    <div className={`relative min-w-0 rounded-xl bg-chapa ${active ? activeRing : 'ring-1 ring-chapa-edge'}`}>
      <button
        type="button"
        onClick={() => onChange(selectSlot(state, slot))}
        disabled={locked}
        aria-pressed={active}
        aria-label={`${slotNames[slot]}${slot === 'second' ? ' (opcional)' : ''}: ${name ?? prompt}`}
        className={`flex min-h-14 w-full flex-col justify-center rounded-xl py-2 pl-3 text-left disabled:cursor-not-allowed ${name ? 'pr-12' : 'pr-3'}`}
      >
        <span className="flex items-center gap-1.5 text-[0.8125rem] text-crema-muted">
          <span aria-hidden="true" className={`size-2.5 rounded-full ${slot === 'first' ? 'bg-heraldo' : 'bg-mostaza'}`} />
          {slot === 'first' ? slotNames.first : `${slotNames.second} (opcional)`}
        </span>
        <span className={`line-clamp-2 text-[0.9375rem] leading-tight font-bold ${name ? '' : 'text-crema-muted'}`}>{name ?? prompt}</span>
      </button>
      {name ? (
        <button
          type="button"
          onClick={() => onChange(clearSlot(state, slot))}
          aria-label={`Quitar ${name} de la ${slotNames[slot]}`}
          className="group absolute top-1/2 right-0.5 grid size-11 -translate-y-1/2 place-items-center rounded-lg text-crema-muted"
        >
          <span className="grid size-8 place-items-center rounded-lg transition-colors group-hover:bg-chapa-edge group-hover:text-crema">
            <X aria-hidden="true" className="size-4.5" />
          </span>
        </button>
      ) : null}
    </div>
  )
}

/** Sticky top block: diagram, what is being built, the two slots, and the live price. */
export function BuilderSummary({ state, candidates, onChange, sticky = true }: BuilderViewProps & { sticky?: boolean }) {
  const mode = builderMode(state)
  const price = builderPrice(state, candidates)

  return (
    <div className={`${sticky ? 'sticky top-0 z-10' : ''} border-b border-chapa-edge bg-chapa-high px-4 py-3 sm:px-6`}>
      <div className="flex items-center gap-3 min-[360px]:gap-4">
        <SplitPizzaDiagram first={state.first !== null} second={state.second !== null} className="size-[clamp(5rem,26vw,7rem)] shrink-0" />
        <div className="min-w-0 flex-1">
          <p className={`inline-flex min-h-7 items-center rounded-full px-3 text-[0.875rem] font-bold ${modeStyles[mode]}`}>{modeLabels[mode]}</p>
          <p aria-live="polite" className="type-price mt-2 text-[clamp(0.9375rem,4.6vw,1.0625rem)] leading-snug">
            {price ? (
              <>
                {/* The mode is spoken here and shown by the pill above. */}
                <span className="sr-only">{modeLabels[price.mode]}: </span>
                <span data-testid="precio-armado">
                  {price.mode === 'mitad' ? (
                    <>
                      {formatArs(price.first)} + {formatArs(price.second)}{' '}
                      <span className="whitespace-nowrap">
                        = <span className="text-mostaza">{formatArs(price.total)}</span>
                      </span>
                    </>
                  ) : (
                    <span className="text-mostaza">{formatArs(price.total)}</span>
                  )}
                </span>
              </>
            ) : (
              <span className="font-sans font-normal text-crema-muted">Elegí al menos un gusto</span>
            )}
          </p>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <SlotButton slot="first" state={state} candidates={candidates} onChange={onChange} />
        <SlotButton slot="second" state={state} candidates={candidates} onChange={onChange} />
      </div>
    </div>
  )
}

/** One list of flavors with a half price. Tapping fills the active slot; the other half's flavor is disabled (D3). */
export function FlavorList({ state, candidates, onChange }: BuilderViewProps) {
  const selectedClass = state.active === 'first' ? 'bg-heraldo text-white ring-heraldo' : 'bg-mostaza text-pino-ink ring-mostaza'

  return (
    <section aria-labelledby="gustos-titulo">
      <h3 id="gustos-titulo" className="text-[0.9375rem] font-bold">
        Gusto para la {slotNames[state.active]}
      </h3>
      <ul className="mt-2 flex flex-col gap-1.5">
        {candidates.map((product) => {
          const price = halfPrice(product)
          const taken = isTakenByOtherSlot(state, product.id)
          const selected = state[state.active] === product.id
          const note = taken ? 'En la otra mitad' : !product.inStock ? 'Sin stock' : null
          return (
            <li key={product.id}>
              <button
                type="button"
                onClick={() => onChange(assignFlavor(state, product.id))}
                disabled={taken || !product.inStock || price === null}
                aria-pressed={selected}
                className={`flex min-h-13 w-full items-center justify-between gap-3 rounded-xl px-4 py-2 text-left ring-1 transition-colors disabled:cursor-not-allowed ${
                  selected ? selectedClass : 'bg-chapa ring-chapa-edge hover:ring-crema-muted/60 disabled:opacity-55 disabled:hover:ring-chapa-edge'
                }`}
              >
                <span className="min-w-0">
                  <span className="block leading-tight font-semibold">{product.name}</span>
                  {note ? <span className="block text-[0.8125rem] font-semibold text-mostaza">{note}</span> : null}
                </span>
                {price !== null ? <span className="type-price shrink-0 text-[1.0625rem]">{formatArs(price)}</span> : null}
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

interface PizzaBuilderSheetProps {
  /** Open request: the preselected first half, or `null` for an empty start. `null` request = closed. */
  request: { firstId: string | null } | null
  /** Pizzas with a published half price. */
  candidates: Product[]
  onClose: () => void
}

/**
 * "Armá tu pizza" (D1–D3): the first half is required and the second optional. One flavor adds a half pizza;
 * two add a half-and-half priced as the sum of both halves (RN-10). A flavor never repeats.
 */
export function PizzaBuilderSheet({ request, candidates, onClose }: PizzaBuilderSheetProps) {
  const { shown, session } = useSheetContent(request)
  return shown ? (
    <BuilderContent key={session} open={request !== null} initialFirst={shown.firstId} candidates={candidates} onClose={onClose} />
  ) : null
}

function BuilderContent({
  open,
  initialFirst,
  candidates,
  onClose,
}: {
  open: boolean
  initialFirst: string | null
  candidates: Product[]
  onClose: () => void
}) {
  const add = useOrderStore((state) => state.add)
  const [state, setState] = useState(() => initBuilder(initialFirst))
  const [quantity, setQuantity] = useState(1)
  const [note, setNote] = useState('')
  const mode = builderMode(state)
  const price = builderPrice(state, candidates)
  const touched = state.first !== initialFirst || state.second !== null || note.trim() !== ''

  const submit = () => {
    const line = buildPizzaLine(state, candidates, quantity, note)
    if (!line) return
    add(line)
    onClose()
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      labelledBy={TITLE_ID}
      dismissOnBackdrop={!touched}
      header={
        <h2 id={TITLE_ID} className="type-display text-[1.5rem]">
          Armá tu pizza
        </h2>
      }
      footer={
        <PrimaryAction
          onClick={submit}
          disabled={!price}
          label={price ? (mode === 'mitad' ? 'Agregar mitad y mitad' : 'Agregar media pizza') : 'Elegí al menos un gusto'}
          amount={price ? formatArs(price.total * quantity) : null}
        />
      }
    >
      <BuilderSummary state={state} candidates={candidates} onChange={setState} />

      <div className="flex flex-col gap-5 p-4 sm:p-6">
        <p className="text-[0.9375rem] leading-snug text-crema-muted">
          Con un gusto es media pizza. Con dos, mitad y mitad: se suman los precios de las dos medias.
        </p>

        <FlavorList state={state} candidates={candidates} onChange={setState} />

        <div className="flex items-center justify-between gap-4">
          <span className="text-[0.9375rem] font-semibold">Cantidad</span>
          <Stepper
            value={quantity}
            min={1}
            max={MAX_QUANTITY}
            itemLabel="pizza"
            onIncrement={() => setQuantity((value) => Math.min(MAX_QUANTITY, value + 1))}
            onDecrement={() => setQuantity((value) => Math.max(1, value - 1))}
          />
        </div>

        <div>
          <label htmlFor="aclaracion-pizza" className="text-[0.9375rem] font-semibold">
            Aclaración <span className="font-normal text-crema-muted">(opcional)</span>
          </label>
          <textarea
            id="aclaracion-pizza"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            maxLength={NOTE_MAX_LENGTH}
            rows={2}
            placeholder="Ej.: sin aceitunas"
            enterKeyHint="done"
            className="mt-2 w-full resize-none rounded-xl bg-chapa px-3.5 py-3 text-[1rem] ring-1 ring-chapa-edge focus-visible:ring-0"
          />
        </div>
      </div>
    </Sheet>
  )
}
