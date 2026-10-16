import { LayoutGrid } from 'lucide-react'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

export interface BarItem {
  id: string
  label: string
}

interface CategoryBarProps {
  items: BarItem[]
  activeId: string | undefined
  onSelect: (id: string) => void
  onOpenIndex: () => void
}

/**
 * Sticky category bar (RF-02) on black sheet with a thin real-pine edge. Opaque, no motion other than
 * the red plate that slides to the active category.
 */
export function CategoryBar({ items, activeId, onSelect, onOpenIndex }: CategoryBarProps) {
  const scroller = useRef<HTMLDivElement>(null)
  const links = useRef(new Map<string, HTMLAnchorElement>())
  const [plate, setPlate] = useState<{ left: number; width: number } | null>(null)

  const measure = useCallback(() => {
    const link = activeId ? links.current.get(activeId) : undefined
    if (link) setPlate({ left: link.offsetLeft, width: link.offsetWidth })
  }, [activeId])

  // Label widths change when the web font finishes loading or the viewport changes.
  useEffect(() => {
    let cancelled = false
    document.fonts?.ready.then(() => {
      if (!cancelled) measure()
    })
    window.addEventListener('resize', measure)
    return () => {
      cancelled = true
      window.removeEventListener('resize', measure)
    }
  }, [measure])

  useLayoutEffect(() => {
    const link = activeId ? links.current.get(activeId) : undefined
    const container = scroller.current
    if (!link || !container) return
    measure()
    const target = link.offsetLeft - (container.clientWidth - link.offsetWidth) / 2
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    container.scrollTo?.({ left: target, behavior: reduceMotion ? 'auto' : 'smooth' })
  }, [activeId, measure])

  return (
    <nav aria-label="Categorías de la carta" className="sticky top-0 z-30 bg-chapa shadow-[0_12px_20px_-14px_rgb(0_0_0/0.9)]">
      <div className="flex items-center gap-1 py-1 pl-2 sm:pl-4 lg:pl-0">
        <button
          type="button"
          onClick={onOpenIndex}
          aria-label="Categorías"
          aria-haspopup="dialog"
          className="grid size-11 shrink-0 place-items-center rounded-xl bg-chapa-high text-crema ring-1 ring-chapa-edge transition-colors hover:bg-chapa-edge"
        >
          <LayoutGrid aria-hidden="true" className="size-5" />
        </button>
        <div
          ref={scroller}
          className="relative flex min-w-0 flex-1 gap-0.5 overflow-x-auto pr-8 pl-2 [mask-image:linear-gradient(90deg,transparent,black_20px,black_calc(100%-24px),transparent)] [scrollbar-width:none]"
        >
          {plate ? (
            <span
              aria-hidden="true"
              className="absolute top-0 bottom-0 left-0 rounded-xl bg-heraldo transition-[transform,width] duration-300 ease-[var(--ease-out-soft)] motion-reduce:transition-none"
              style={{ width: plate.width, transform: `translateX(${plate.left}px)` }}
            />
          ) : null}
          {items.map((item) => {
            const active = item.id === activeId
            return (
              <a
                key={item.id}
                href={`#${item.id}`}
                ref={(element) => {
                  if (element) links.current.set(item.id, element)
                  else links.current.delete(item.id)
                }}
                aria-current={active ? 'true' : undefined}
                onClick={() => onSelect(item.id)}
                className={`relative z-10 flex min-h-11 shrink-0 items-center rounded-xl px-3.5 text-[0.9375rem] font-[750] whitespace-nowrap [font-stretch:106%] transition-colors duration-200 focus-visible:-outline-offset-3 ${
                  active ? 'text-white' : 'text-crema-muted hover:text-crema'
                }`}
              >
                {item.label}
              </a>
            )
          })}
        </div>
      </div>
      <div aria-hidden="true" className="texture-pino h-1" />
    </nav>
  )
}
