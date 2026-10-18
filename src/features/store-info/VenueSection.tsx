import { ExternalLink, MapPin } from 'lucide-react'
import { storeInfo } from '@/data/store-info'

/**
 * The real place, apart from the brand video: the dining room photo reframed toward the black corrugated sheet, the
 * pine, the tables, and the counter, away from the ceiling's fluorescent tubes. It comes after the menu so that the
 * cover never pushes the menu down, and it loads lazily.
 */
export function VenueSection() {
  return (
    <section aria-labelledby="local-titulo" className="mx-auto max-w-6xl px-4 pt-14 sm:px-6">
      <h2 id="local-titulo" className="type-display text-[clamp(1.875rem,8.5vw,2.75rem)]">
        El local
      </h2>
      <figure className="relative isolate mt-3 aspect-[16/10] overflow-hidden rounded-2xl shadow-[0_24px_48px_-24px_rgb(0_0_0/0.9)] ring-1 ring-chapa-edge sm:aspect-[16/9] lg:aspect-[21/9]">
        <img
          src="/images/local/salon-heraldo-pizza-800.webp"
          srcSet="/images/local/salon-heraldo-pizza-800.webp 800w, /images/local/salon-heraldo-pizza.webp 1402w"
          sizes="(min-width: 1152px) 1104px, 100vw"
          width={800}
          height={640}
          loading="lazy"
          decoding="async"
          alt="Salón de Heraldo Pizza: chapa negra, madera de pino y la barra"
          className="absolute inset-0 -z-10 size-full origin-[0%_100%] scale-[1.6] object-cover object-[0%_100%] contrast-[1.06] saturate-[1.15] sm:origin-[24%_96%] sm:scale-[1.15] sm:object-[24%_96%] lg:origin-[50%_92%] lg:scale-100 lg:object-[50%_92%]"
        />
        {/* Warm light from the pendant side, and the street beyond the windows kept dim. */}
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-[radial-gradient(120%_90%_at_20%_15%,rgb(255_170_80/0.18),transparent_60%),linear-gradient(180deg,rgb(19_21_24/0.6)_0%,transparent_40%)] mix-blend-normal"
        />
      </figure>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <p className="flex items-center gap-2 text-crema-muted">
          <MapPin aria-hidden="true" className="size-4 shrink-0 text-mostaza" />
          {storeInfo.address}, {storeInfo.city}
        </p>
        <a
          href={storeInfo.mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-chapa-high px-4 font-semibold text-crema ring-1 ring-chapa-edge transition-colors hover:bg-chapa-edge"
        >
          Cómo llegar
          <ExternalLink aria-hidden="true" className="size-4 text-mostaza" />
        </a>
      </div>
    </section>
  )
}
