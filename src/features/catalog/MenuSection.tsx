import { ChevronRight } from 'lucide-react'
import type { Product } from '@/domain/catalog'
import { FlavorBoard } from './FlavorBoard'
import { CompactRow, PizzaRow, ProductRow } from './ProductRow'
import { CategoryStamp } from './CategoryStamp'
import { SplitPizzaDiagram } from './SplitPizzaDiagram'
import { sectionDomId, type MenuSectionModel } from './presentation'

interface MenuSectionProps {
  section: MenuSectionModel
  onOpenProduct: (product: Product) => void
  /** Opens "Armá tu pizza", empty or with a flavor as the first half. */
  onBuildPizza: (product: Product | null) => void
}

/** Entry to "Armá tu pizza" (D1, D2), first in the pizza section. */
export function PizzaBuilderEntry({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-haspopup="dialog"
      className="mt-3 flex w-full items-center gap-3.5 rounded-2xl bg-heraldo p-3.5 text-left text-white shadow-[0_14px_28px_-16px_rgb(215_25_31/0.9),inset_0_1px_0_rgb(255_255_255/0.2)] transition-[background-color,transform] duration-150 hover:bg-heraldo-deep active:scale-[0.99] motion-reduce:active:scale-100"
    >
      <span className="grid size-14 shrink-0 place-items-center rounded-full bg-chapa p-2">
        <SplitPizzaDiagram first second className="size-full" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[1.125rem] leading-tight font-[800] [font-stretch:110%]">Armá tu pizza</span>
        <span className="mt-1 block text-[0.9375rem] leading-snug">Media pizza o mitad y mitad, con los gustos que quieras.</span>
      </span>
      <ChevronRight aria-hidden="true" className="size-5 shrink-0" />
    </button>
  )
}

/** One menu category. The layout follows the shape of its data (see presentation.ts). */
export function MenuSection({ section, onOpenProduct, onBuildPizza }: MenuSectionProps) {
  const id = sectionDomId(section.category)

  return (
    <section id={id} aria-labelledby={`${id}-titulo`} className="scroll-mt-16 px-4 pt-10 sm:px-6 lg:px-0">
      <div className="flex items-center gap-3">
        <CategoryStamp name={section.category.name} />
        <h2 id={`${id}-titulo`} className="type-display min-w-0 text-[clamp(1.875rem,8.5vw,2.75rem)] break-words">
          {section.category.name}
        </h2>
      </div>
      {section.layout === 'pizza' ? (
        <>
          <p className="mt-2 text-[0.9375rem] text-crema-muted">Tocá el precio de la entera para sumarla.</p>
          <PizzaBuilderEntry onOpen={() => onBuildPizza(null)} />
        </>
      ) : null}

      {section.boardItems.length > 0 ? (
        <div className="mt-3">
          <FlavorBoard items={section.boardItems} prefix={section.boardPrefix} onOpen={onOpenProduct} />
        </div>
      ) : null}

      {section.items.length > 0 ? (
        <ul className={`${section.layout === 'compact' ? 'grid gap-x-8 md:grid-cols-2' : 'grid gap-x-8 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2'} ${section.boardItems.length > 0 ? '' : 'mt-1'}`}>
          {section.items.map((product) => {
            if (section.layout === 'pizza') {
              return <PizzaRow key={product.id} product={product} onOpen={onOpenProduct} onBuild={onBuildPizza} />
            }
            if (section.layout === 'compact') return <CompactRow key={product.id} product={product} onOpen={onOpenProduct} />
            return <ProductRow key={product.id} product={product} onOpen={onOpenProduct} />
          })}
        </ul>
      ) : null}
    </section>
  )
}
