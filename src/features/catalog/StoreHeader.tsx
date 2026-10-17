import { Clock, Info, MapPin } from 'lucide-react'
import { storeInfo } from '@/data/store-info'

/**
 * The venue leads. The real photo of the dining room fills the top on its own: reframed toward the black corrugated
 * sheet, the pine slats, the tables, and the pine counter, away from the ceiling's fluorescent tubes and the street.
 * Nothing sits on it. The brand follows on the black sheet: the logo medallion just overlaps the photo's lower edge,
 * then the name, address, hours, and «Info». The photo stays short enough that the menu starts in the first screen.
 */
export function StoreHeader({ onOpenInfo }: { onOpenInfo: () => void }) {
  return (
    <header id="top">
      <figure className="relative isolate m-0 h-[clamp(11rem,27svh,14.5rem)] overflow-hidden sm:h-[clamp(14rem,32svh,18rem)] lg:h-[22rem]">
        <div className="absolute inset-0 -z-10 motion-safe:animate-[room-focus_900ms_var(--ease-out-expo)_both]">
          <img
            src="/images/local/salon-heraldo-pizza-800.webp"
            srcSet="/images/local/salon-heraldo-pizza-800.webp 800w, /images/local/salon-heraldo-pizza.webp 1402w"
            sizes="100vw"
            width={800}
            height={640}
            fetchPriority="high"
            alt="Salón de Heraldo Pizza: chapa negra, madera de pino y la barra"
            className="h-full w-full origin-[0%_100%] scale-[1.5] object-cover object-[0%_100%] contrast-[1.06] saturate-[1.15] sm:origin-[24%_96%] sm:scale-[1.15] sm:object-[24%_96%] lg:origin-[50%_92%] lg:scale-100 lg:object-[50%_92%]"
          />
        </div>
        {/* Warm light from the pendant side, a soft vignette, and the fade into the black sheet below. */}
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-[radial-gradient(120%_90%_at_20%_15%,rgb(255_170_80/0.18),transparent_60%),radial-gradient(140%_120%_at_50%_40%,transparent_55%,rgb(0_0_0/0.45)_100%)] mix-blend-soft-light"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgb(19_21_24/0.7)_0%,rgb(19_21_24/0.3)_24%,transparent_42%,transparent_62%,rgb(19_21_24/0.65)_86%,var(--color-chapa)_100%)]"
        />
      </figure>

      <div className="mx-auto grid max-w-6xl grid-cols-[auto_1fr] items-end gap-x-3 px-4 pb-3 sm:gap-x-5 sm:px-6">
        <span className="texture-pino relative z-10 row-start-1 -mt-[clamp(2.4rem,10vw,3.25rem)] size-[clamp(4.25rem,19vw,6rem)] shrink-0 rounded-full p-[3px] shadow-[0_10px_22px_-6px_rgb(0_0_0/0.9)] motion-safe:animate-[logo-pop_600ms_var(--ease-out-expo)_300ms_both] sm:row-span-2 sm:self-center">
          <span className="grid size-full place-items-center rounded-full bg-chapa">
            <img src="/images/logo-heraldo-pizza.webp" alt="" width={512} height={512} className="size-[88%]" />
          </span>
        </span>
        <h1 className="type-display min-w-0 self-end pb-1 text-[clamp(1.625rem,7.4vw,3.25rem)]">{storeInfo.name}</h1>

        <div className="col-span-2 mt-2 grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1 text-[clamp(0.8125rem,3.7vw,0.9375rem)] leading-snug text-crema-muted sm:col-span-1 sm:col-start-2 sm:mt-0 sm:flex sm:flex-wrap sm:gap-x-6">
          <p className="flex min-w-0 items-center gap-2">
            <MapPin aria-hidden="true" className="size-4 shrink-0 text-mostaza" />
            {storeInfo.address}, {storeInfo.city}
          </p>
          <button
            type="button"
            onClick={onOpenInfo}
            aria-label="Info del local"
            aria-haspopup="dialog"
            className="inline-flex min-h-11 shrink-0 items-center gap-1.5 self-center rounded-full bg-chapa-high px-3.5 text-[0.9375rem] font-semibold text-crema ring-1 ring-chapa-edge transition-colors hover:bg-chapa-edge sm:order-last sm:ml-auto"
          >
            <Info aria-hidden="true" className="size-4.5 text-mostaza" />
            Info
          </button>
          <p className="col-span-2 flex min-w-0 items-center gap-2">
            <Clock aria-hidden="true" className="size-4 shrink-0 text-mostaza" />
            {storeInfo.hours}
          </p>
        </div>
      </div>
    </header>
  )
}
