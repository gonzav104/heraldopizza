import { useMemo, useState } from 'react'
import { PrimaryAction } from '@/components/ui/PrimaryAction'
import { Sheet } from '@/components/ui/Sheet'
import { Stepper } from '@/components/ui/Stepper'
import { useSheetContent } from '@/components/ui/useSheetHistory'
import type { FlavorChoice, Promotion } from '@/domain/catalog'
import { NOTE_MAX_LENGTH, normalizeFlavors } from '@/features/cart/order-lines'
import { useOrderStore } from '@/features/cart/order-store'
import { formatArs } from '@/lib/money'
import { useCatalog } from './catalog-context'
import { choiceFlavors, flavorLabeler, pickableFlavors } from './dozen'

const TITLE_ID = 'docena-titulo'

interface DozenBuilderSheetProps {
  /** The promotion being filled in, or `null` when closed. */
  promotion: Promotion | null
  onClose: () => void
}

/**
 * «Elegí tus 12 empanadas» (P4): flavors from the catalog and how many of each, until exactly the combo's units. The
 * price is the promotion's own, whatever the flavors. Fresh picks every time it opens.
 */
export function DozenBuilderSheet({ promotion, onClose }: DozenBuilderSheetProps) {
  const { shown, session } = useSheetContent(promotion)
  return shown?.flavorChoice ? (
    <DozenContent key={session} open={promotion !== null} promotion={shown} choice={shown.flavorChoice} onClose={onClose} />
  ) : null
}

function DozenContent({ open, promotion, choice, onClose }: { open: boolean; promotion: Promotion; choice: FlavorChoice; onClose: () => void }) {
  const { products } = useCatalog()
  const add = useOrderStore((state) => state.add)
  const flavors = useMemo(() => pickableFlavors(choice, products), [choice, products])
  const label = useMemo(() => flavorLabeler(choiceFlavors(choice, products)), [choice, products])
  const [picks, setPicks] = useState<Record<string, number>>({})
  const [note, setNote] = useState('')

  const total = Object.values(picks).reduce((sum, quantity) => sum + quantity, 0)
  const left = choice.units - total
  const complete = left === 0

  const change = (productId: string, delta: number) =>
    setPicks((current) => {
      const value = (current[productId] ?? 0) + delta
      const sum = Object.values(current).reduce((acc, quantity) => acc + quantity, 0) + delta
      return value < 0 || sum > choice.units ? current : { ...current, [productId]: value }
    })

  const submit = () => {
    if (!complete) return
    const flavorPicks = normalizeFlavors(Object.entries(picks).map(([productId, quantity]) => ({ productId, quantity })))
    add({ kind: 'promotion', promotionId: promotion.id, quantity: 1, note, flavors: flavorPicks })
    onClose()
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      labelledBy={TITLE_ID}
      dismissOnBackdrop={total === 0 && note.trim() === ''}
      header={
        <h2 id={TITLE_ID} className="type-display text-[1.5rem]">
          Elegí tus {choice.units} empanadas
        </h2>
      }
      footer={
        <PrimaryAction
          onClick={submit}
          disabled={!complete}
          label={complete ? 'Agregar docena' : `Faltan ${left} ${left === 1 ? 'empanada' : 'empanadas'}`}
          amount={formatArs(promotion.price)}
        />
      }
    >
      {/* Always in view while the list scrolls: how many are picked and how many are left. */}
      <p
        role="status"
        className="sticky top-0 z-10 border-b border-chapa-edge bg-chapa-high px-4 py-3 text-[1rem] font-bold sm:px-6"
      >
        Elegiste {total} de {choice.units} ·{' '}
        <span className={complete ? 'text-mostaza' : ''}>{complete ? 'Docena completa' : `Faltan ${left}`}</span>
      </p>

      <div className="flex flex-col gap-5 p-4 sm:p-6">
        <p className="text-[0.9375rem] leading-snug text-crema-muted">
          {promotion.title}: {formatArs(promotion.price)}, con los gustos y las cantidades que quieras.
        </p>

        <ul>
          {flavors.map((product) => {
            const value = picks[product.id] ?? 0
            const name = label(product)
            return (
              <li key={product.id} className="flex min-h-14 items-center justify-between gap-3 border-b border-chapa-edge py-1.5 last:border-b-0">
                <span className="min-w-0 font-bold [font-stretch:104%]">{name}</span>
                <Stepper
                  value={value}
                  max={value + left}
                  itemLabel={name}
                  onIncrement={() => change(product.id, 1)}
                  onDecrement={() => change(product.id, -1)}
                />
              </li>
            )
          })}
        </ul>

        <div>
          <label htmlFor="aclaracion-docena" className="text-[0.9375rem] font-semibold">
            Aclaración <span className="font-normal text-crema-muted">(opcional)</span>
          </label>
          <textarea
            id="aclaracion-docena"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            maxLength={NOTE_MAX_LENGTH}
            rows={2}
            placeholder="Ej.: bien calientes"
            enterKeyHint="done"
            className="mt-2 w-full resize-none rounded-xl bg-chapa px-3.5 py-3 text-[1rem] ring-1 ring-chapa-edge focus-visible:ring-0"
          />
        </div>
      </div>
    </Sheet>
  )
}
