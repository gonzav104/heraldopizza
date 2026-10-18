import { Clock, Info, MapPin } from 'lucide-react'
import { storeInfo } from '@/data/store-info'
import { BrandVideo } from '@/features/catalog/BrandVideo'

/**
 * The brand leads: the owner's animation of the Heraldo mascot plays on its own, with nothing on top of it. On phones
 * it runs full width at its 16:9 frame (cropping it would cut the words and the products); from tablets up it sits
 * beside the brand. The name, a short line, the address, the hours, and the two actions follow on the black sheet.
 * The real dining room has its own section after the menu (VenueSection).
 */
export function StoreHeader({ onOpenInfo }: { onOpenInfo: () => void }) {
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

        <ul className="mt-3 flex flex-col gap-1 text-[clamp(0.8125rem,3.7vw,0.9375rem)] leading-snug text-crema-muted md:mt-5">
          <li className="flex items-center gap-2">
            <MapPin aria-hidden="true" className="size-4 shrink-0 text-mostaza" />
            {storeInfo.address}, {storeInfo.city}
          </li>
          <li className="flex items-center gap-2">
            <Clock aria-hidden="true" className="size-4 shrink-0 text-mostaza" />
            {storeInfo.hours}
          </li>
        </ul>

        <div className="mt-4 flex gap-2.5 md:mt-6">
          <a
            href="#carta"
            className="inline-flex min-h-12 flex-1 items-center justify-center rounded-full bg-heraldo px-6 text-[1.0625rem] font-bold text-white shadow-[0_12px_24px_-12px_rgb(215_25_31/0.9)] transition-colors hover:bg-heraldo-deep md:flex-none"
          >
            Ver la carta
          </a>
          <button
            type="button"
            onClick={onOpenInfo}
            aria-label="Info del local"
            aria-haspopup="dialog"
            className="inline-flex min-h-12 shrink-0 items-center gap-1.5 rounded-full bg-chapa-high px-4 text-[0.9375rem] font-semibold text-crema ring-1 ring-chapa-edge transition-colors hover:bg-chapa-edge"
          >
            <Info aria-hidden="true" className="size-4.5 text-mostaza" />
            Info
          </button>
        </div>
      </div>
    </header>
  )
}
