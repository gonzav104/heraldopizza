import { useEffect, useMemo, useRef } from 'react'
import type { Category, Product, Promotion } from '@/domain/catalog'
import { useSheetHistory } from '@/components/ui/useSheetHistory'
import { CatalogContext, createCatalogData } from '@/features/catalog/catalog-context'
import { CategoryBar } from '@/features/catalog/CategoryBar'
import { CategoryIndexSheet } from '@/features/catalog/CategoryIndexSheet'
import { DozenBuilderSheet } from '@/features/catalog/DozenBuilderSheet'
import { MenuSection } from '@/features/catalog/MenuSection'
import { PizzaBuilderSheet } from '@/features/catalog/PizzaBuilderSheet'
import { ProductSheet } from '@/features/catalog/ProductSheet'
import { PromoRail } from '@/features/catalog/PromoRail'
import { StoreHeader } from '@/features/catalog/StoreHeader'
import { buildMenuSections, halfAndHalfCandidates, sectionDomId } from '@/features/catalog/presentation'
import { useActiveSection } from '@/features/catalog/useActiveSection'
import { OrderAnnouncer, OrderBar } from '@/features/cart/CartBar'
import { OrderPanel } from '@/features/cart/OrderPanel'
import { OrderSheet, type OrderStep } from '@/features/cart/OrderSheet'
import { OrderStorageNotice } from '@/features/cart/OrderStorageNotice'
import { PrivacySheet } from '@/features/store-info/PrivacySheet'
import { LocalSection } from '@/features/store-info/LocalSection'
import { SiteFooter } from '@/features/store-info/SiteFooter'
import { StoreInfoSheet } from '@/features/store-info/StoreInfoSheet'

interface StorefrontProps {
  categories: Category[]
  products: Product[]
  promotions: Promotion[]
}

const PROMOS_ID = 'promos'

/**
 * The public menu, order first: store header, one sticky category bar, the menu on black sheet,
 * and the order on the pine counter (bar after the footer on phones, side panel on desktop).
 */
export function Storefront({ categories, products, promotions }: StorefrontProps) {
  const catalog = useMemo(() => createCatalogData(categories, products, promotions), [categories, products, promotions])
  const sections = useMemo(() => buildMenuSections(categories, products), [categories, products])
  const halves = useMemo(() => halfAndHalfCandidates(products, categories), [products, categories])

  const indexItems = useMemo(
    () => [
      ...(promotions.length > 0 ? [{ id: PROMOS_ID, label: 'Promos', count: promotions.length }] : []),
      ...sections.map((section) => ({
        id: sectionDomId(section.category),
        label: section.category.name,
        count: section.items.length + section.boardItems.length,
      })),
    ],
    [sections, promotions.length],
  )
  const sectionIds = useMemo(() => indexItems.map((item) => item.id), [indexItems])
  const [activeId, setActiveId] = useActiveSection(sectionIds)

  const productSheet = useSheetHistory<Product>('producto')
  const builderSheet = useSheetHistory<{ firstId: string | null }>('armar-pizza')
  const orderSheet = useSheetHistory<OrderStep>('pedido')
  const infoSheet = useSheetHistory<true>('info')
  const indexSheet = useSheetHistory<true>('categorias')
  const privacySheet = useSheetHistory<true>('privacidad')
  const dozenSheet = useSheetHistory<Promotion>('docena')

  // Sheets never stack: the product sheet closes first, then "Armá tu pizza" opens with that flavor.
  const pendingBuild = useRef<string | null>(null)
  const openBuilderAfterProduct = () => {
    const firstId = pendingBuild.current
    pendingBuild.current = null
    if (firstId) builderSheet.open({ firstId })
  }

  // The index sheet closes first; the page scrolls to the chosen category once the dialog is gone.
  // The scroll waits one frame: requested while the modal sheet is still closing (this runs in its close cleanup),
  // Chromium drops it and the page never moves. A newer pick or leaving the menu cancels a frame still pending.
  const pendingSection = useRef<string | null>(null)
  const scrollFrame = useRef<number | null>(null)
  const jumpToPendingSection = () => {
    const id = pendingSection.current
    pendingSection.current = null
    if (!id) return
    if (scrollFrame.current !== null) cancelAnimationFrame(scrollFrame.current)
    scrollFrame.current = requestAnimationFrame(() => {
      scrollFrame.current = null
      const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
      document.getElementById(id)?.scrollIntoView?.({ behavior: reduceMotion ? 'auto' : 'smooth' })
    })
  }
  useEffect(
    () => () => {
      if (scrollFrame.current !== null) cancelAnimationFrame(scrollFrame.current)
    },
    [],
  )

  return (
    <CatalogContext value={catalog}>
      <div className="texture-chapa min-h-dvh">
        <OrderStorageNotice />
        <StoreHeader />
        <LocalSection onOpenInfo={() => infoSheet.open(true)} />

        <div className="mx-auto max-w-6xl lg:grid lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-10 lg:px-6">
          <main className="min-w-0">
            <CategoryBar items={indexItems} activeId={activeId} onSelect={setActiveId} onOpenIndex={() => indexSheet.open(true)} />
            <PromoRail promotions={promotions} onChoose={dozenSheet.open} />
            {sections.map((section) => (
              <MenuSection
                key={section.category.id}
                section={section}
                onOpenProduct={productSheet.open}
                onBuildPizza={(product) => builderSheet.open({ firstId: product?.id ?? null })}
              />
            ))}
          </main>

          <aside aria-label="Tu pedido" className="hidden pt-4 lg:block">
            <OrderPanel onContinue={() => orderSheet.open('details')} />
          </aside>
        </div>

        <SiteFooter onOpenPrivacy={() => privacySheet.open(true)} />

        {/* Last in the flow on purpose: sticky while scrolling, resting below the footer at the end. */}
        <OrderBar onOpenOrder={() => orderSheet.open('cart')} />
        <OrderAnnouncer />

        <ProductSheet
          product={productSheet.value}
          onClose={productSheet.close}
          onAfterClose={openBuilderAfterProduct}
          onBuildPizza={(product) => {
            pendingBuild.current = product.id
            productSheet.close()
          }}
        />
        <PizzaBuilderSheet request={builderSheet.value} candidates={halves} onClose={builderSheet.close} />
        <DozenBuilderSheet promotion={dozenSheet.value} onClose={dozenSheet.close} />
        <OrderSheet step={orderSheet.value} onClose={orderSheet.close} />
        <StoreInfoSheet open={infoSheet.value !== null} onClose={infoSheet.close} />
        <PrivacySheet open={privacySheet.value !== null} onClose={privacySheet.close} />
        <CategoryIndexSheet
          open={indexSheet.value !== null}
          items={indexItems}
          activeId={activeId}
          onClose={indexSheet.close}
          onAfterClose={jumpToPendingSection}
          onPick={(id) => {
            pendingSection.current = id
            setActiveId(id)
            indexSheet.close()
          }}
        />
      </div>
    </CatalogContext>
  )
}
