import { Clock, Info, MapPin } from 'lucide-react'
import { storeInfo } from '@/data/store-info'

/**
 * Centered brand header. The real photo of the dining room is the stage: logo and name sit on it, centered, with air above
 * the logo; address and hours follow on the black sheet. The photo scales with the screen height (about a quarter of a
 * phone) so the menu is never pushed down, and "Info" floats on the photo so it does not compete with the name.
 */
export function StoreHeader({ onOpenInfo }: { onOpenInfo: () => void }) {
  return (
    <header id="top">
      <div className="relative isolate flex h-[clamp(10.5rem,27svh,14rem)] flex-col items-center justify-end overflow-hidden pb-4 lg:h-64 lg:pb-6">
        <div className="absolute inset-0 -z-10 motion-safe:animate-[room-focus_900ms_var(--ease-out-expo)_both]">
          <img
            src="/images/local/salon-heraldo-pizza-800.webp"
            srcSet="/images/local/salon-heraldo-pizza-800.webp 800w, /images/local/salon-heraldo-pizza.webp 1402w"
            sizes="100vw"
            width={800}
            height={640}
            fetchPriority="high"
            alt=""
            className="h-full w-full object-cover object-[50%_38%] brightness-[0.82]"
          />
        </div>
        {/* Darkens the top for the Info button and the bottom so the name always reads. */}
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgb(19_21_24/0.55)_0%,transparent_30%,rgb(19_21_24/0.5)_62%,var(--color-chapa)_100%)]"
        />

        <div className="absolute inset-x-0 top-0">
          <div className="mx-auto flex max-w-6xl justify-end px-3 pt-3 sm:px-6">
            <button
              type="button"
              onClick={onOpenInfo}
              aria-label="Info del local"
              aria-haspopup="dialog"
              className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-chapa/75 px-3.5 text-[0.9375rem] font-semibold ring-1 ring-crema/20 backdrop-blur-md transition-colors hover:bg-chapa"
            >
              <Info aria-hidden="true" className="size-4.5 text-mostaza" />
              Info
            </button>
          </div>
        </div>

        <div className="texture-pino size-[clamp(4.5rem,23vw,6.5rem)] shrink-0 rounded-full p-[3px] shadow-[0_10px_22px_-6px_rgb(0_0_0/0.9)] motion-safe:animate-[logo-pop_600ms_var(--ease-out-expo)_300ms_both]">
          <div className="grid size-full place-items-center rounded-full bg-chapa">
            <img src="/images/logo-heraldo-pizza.webp" alt="" width={512} height={512} className="size-[88%]" />
          </div>
        </div>
        <h1 className="type-display mt-2 px-3 text-center text-[clamp(1.625rem,7.6vw,3.25rem)] [text-shadow:0_2px_14px_rgb(0_0_0/0.7)]">
          {storeInfo.name}
        </h1>
      </div>

      <ul className="mx-auto flex max-w-6xl flex-col items-center gap-1 px-4 pt-3 pb-3 text-center text-[clamp(0.8125rem,3.9vw,0.9375rem)] leading-snug text-crema-muted sm:flex-row sm:justify-center sm:gap-x-8 sm:px-6">
        <li className="flex items-center gap-2">
          <MapPin aria-hidden="true" className="size-4 shrink-0 text-mostaza" />
          {storeInfo.address}, {storeInfo.city}
        </li>
        <li className="flex items-center gap-2">
          <Clock aria-hidden="true" className="size-4 shrink-0 text-mostaza" />
          {storeInfo.hours}
        </li>
      </ul>
    </header>
  )
}
