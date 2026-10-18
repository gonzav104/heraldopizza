import { storeInfo } from '@/data/store-info'
import { BrandVideo } from '@/features/catalog/BrandVideo'

/**
 * The brand leads: the owner's animation of the Heraldo mascot plays on its own, with nothing on top of it. On phones
 * it runs full width at its 16:9 frame (cropping it would cut the words and the products); from tablets up it sits
 * beside the brand. Only the logo, the name, and a short line follow, with no call to action: the video already
 * moves, speaks, and shows the products. The real place comes right after, in LocalSection.
 */
export function StoreHeader() {
  return (
    <header id="top" className="mx-auto max-w-6xl md:grid md:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] md:items-center md:gap-8 md:px-6 md:pt-6 lg:gap-12">
      <BrandVideo className="motion-safe:animate-[room-focus_900ms_var(--ease-out-expo)_both] md:order-2 md:rounded-2xl md:shadow-[0_24px_48px_-24px_rgb(0_0_0/0.9)] md:ring-1 md:ring-chapa-edge" />

      <div className="px-4 pt-4 pb-3 sm:px-6 md:order-1 md:px-0 md:py-4">
        <div className="flex items-center gap-3 md:flex-col md:items-start md:gap-4">
          <span className="texture-pino size-[clamp(3.5rem,15vw,4.25rem)] shrink-0 rounded-full p-[3px] shadow-[0_10px_22px_-6px_rgb(0_0_0/0.9)] motion-safe:animate-[logo-pop_600ms_var(--ease-out-expo)_300ms_both] md:size-20">
            <span className="grid size-full place-items-center rounded-full bg-chapa">
              <img src="/images/logo-heraldo-pizza.webp" alt="" width={512} height={512} className="size-[88%]" />
            </span>
          </span>
          <div className="min-w-0">
            <h1 className="type-display text-[clamp(1.75rem,8vw,2.25rem)] leading-none md:text-[clamp(2.25rem,4.4vw,3.5rem)]">{storeInfo.name}</h1>
            <p className="mt-1.5 text-[clamp(0.9375rem,4vw,1.0625rem)] leading-snug text-balance text-crema md:mt-3 md:text-[1.125rem]">
              Pizzas, empanadas, milanesas ¡y mucho más!
            </p>
          </div>
        </div>
      </div>
    </header>
  )
}
