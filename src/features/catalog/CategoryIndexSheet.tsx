import { Sheet } from '@/components/ui/Sheet'
import { CategoryStamp } from './CategoryStamp'

export interface IndexItem {
  id: string
  label: string
  count: number
}

interface CategoryIndexSheetProps {
  open: boolean
  items: IndexItem[]
  activeId: string | undefined
  onPick: (id: string) => void
  onClose: () => void
  onAfterClose: () => void
}

/** Every category at a glance with its item count; picking one jumps there. */
export function CategoryIndexSheet({ open, items, activeId, onPick, onClose, onAfterClose }: CategoryIndexSheetProps) {
  return (
    <Sheet
      open={open}
      onClose={onClose}
      onAfterClose={onAfterClose}
      labelledBy="indice-titulo"
      header={
        <h2 id="indice-titulo" className="type-display text-[1.5rem]">
          Categorías
        </h2>
      }
    >
      <ul className="grid grid-cols-2 gap-2 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:grid-cols-3 sm:p-6">
        {items.map((item) => {
          const active = item.id === activeId
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onPick(item.id)}
                aria-current={active ? 'true' : undefined}
                className={`flex min-h-18 w-full items-center gap-3 rounded-xl p-2.5 text-left ring-1 transition-colors ${
                  active ? 'bg-chapa ring-2 ring-heraldo' : 'bg-chapa ring-chapa-edge hover:ring-crema-muted/60'
                }`}
              >
                <CategoryStamp name={item.label} />
                <span className="min-w-0">
                  <span className="block text-[0.9375rem] leading-tight font-bold [font-stretch:104%]">{item.label}</span>
                  <span className="mt-0.5 block text-[0.8125rem] text-crema-muted">
                    {item.count} {item.count === 1 ? 'opción' : 'opciones'}
                  </span>
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </Sheet>
  )
}
