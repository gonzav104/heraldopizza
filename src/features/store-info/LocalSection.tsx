import { Clock, ExternalLink, Info, MapPin, ShoppingBag } from 'lucide-react'
import type { ReactNode } from 'react'
import { InstagramIcon } from '@/components/ui/InstagramIcon'
import { storeInfo } from '@/data/store-info'
import { InstagramLink } from '@/features/store-info/StoreInfoSheet'

function Detail({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span aria-hidden="true" className="mt-0.5 shrink-0 text-mostaza">
        {icon}
      </span>
      <div className="min-w-0">
        {/* On phones the icon names the fact; the title stays for screen readers. */}
        <dt className="text-[0.8125rem] text-crema-muted max-sm:sr-only">{title}</dt>
        <dd className="text-crema sm:mt-0.5">{children}</dd>
      </div>
    </div>
  )
}

/**
 * The real place, right after the brand video: the owner's photo of the facade at night (black corrugated sheet, the
 * logo in red light, the lit pine interior) proves Heraldo is a real shop. Beside it, the owner's short story and the
 * real facts the info sheet already carries. The photo keeps its vertical frame: 4:5 on phones (only sky and wet pavement are
 * trimmed, never the sign or the entrance), its own 3:4 from tablets up, overlapping a black-sheet panel with the
 * red neon line of the facade's sign.
 */
export function LocalSection({ onOpenInfo }: { onOpenInfo: () => void }) {
  return (
    <section aria-labelledby="local-titulo" className="mx-auto max-w-6xl px-4 pt-6 pb-2 sm:px-6 md:pt-10">
      <div className="md:grid md:grid-cols-12 md:items-center">
        <figure className="relative z-10 m-0 md:col-span-5 md:col-start-1 md:row-start-1">
          <img
            // Web versions of the owner's photo (local-heraldo-pizza.webp, 1086×1448, 1.8 MB, kept as the source).
            src="/images/local/local-heraldo-pizza-900.webp"
            srcSet="/images/local/local-heraldo-pizza-600.webp 600w, /images/local/local-heraldo-pizza-900.webp 900w"
            width={900}
            height={1200}
            sizes="(min-width: 1152px) 460px, (min-width: 768px) 40vw, 100vw"
            loading="lazy"
            decoding="async"
            alt="Fachada de Heraldo Pizza de noche: chapa negra, el cartel con el logo en luz roja y la entrada iluminada"
            className="aspect-[4/5] w-full rounded-2xl bg-chapa-high object-cover object-[50%_30%] shadow-[0_30px_70px_-30px_rgb(215_25_31/0.7),0_20px_40px_-24px_rgb(0_0_0/0.95)] ring-1 ring-chapa-edge md:aspect-[3/4]"
          />
        </figure>

        <div className="relative -mt-8 rounded-2xl bg-chapa-high px-5 pt-12 pb-5 ring-1 ring-chapa-edge md:col-span-8 md:col-start-5 md:row-start-1 md:mt-0 md:py-10 md:pr-10 md:pl-[calc(8.333%+3.5rem)]">
          <span aria-hidden="true" className="block h-[3px] w-16 rounded-full bg-heraldo shadow-[0_0_14px_2px_rgb(215_25_31/0.75)]" />
          <h2 id="local-titulo" className="type-display mt-3 text-[clamp(2rem,9vw,3.25rem)] leading-none md:mt-4">
            El local
          </h2>
          {/* The owner's own text (2026-10-18). Nothing is added to it. */}
          <p className="mt-3 max-w-[58ch] text-[1rem] leading-relaxed text-crema/90 md:mt-4 md:text-[1.0625rem]">
            <span className="mb-2 block text-[clamp(1.1875rem,5vw,1.5rem)] leading-snug font-semibold text-balance text-crema">
              Heraldo Pizza llegó a Campana en 2024, pero la historia detrás del horno empezó mucho antes.
            </span>{' '}
            Heraldo Velazquez, su fundador, lleva más de 15 años trabajando como pizzero y construyendo experiencia en
            distintos proyectos gastronómicos. Hoy esa trayectoria continúa en Campana, con una propuesta propia y una
            identidad marcada por la pizza, el barrio y el oficio.
          </p>
          <p className="mt-2.5 text-[0.875rem] text-crema-muted">
            Antes de Campana pasó por proyectos como Qatar, en San Pedro, y ChavosBar.
          </p>

          <dl className="mt-5 grid gap-3.5 sm:mt-6 sm:grid-cols-2 sm:gap-5">
            <Detail icon={<MapPin className="size-5" />} title="Dirección">
              <span className="flex flex-wrap items-center gap-x-4">
                <span>
                  {storeInfo.address}, {storeInfo.city}
                </span>
                <a
                href={storeInfo.mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                  className="-my-2.5 inline-flex min-h-11 items-center gap-1.5 font-semibold text-crema underline-offset-4 hover:underline"
                >
                  Cómo llegar
                  <ExternalLink aria-hidden="true" className="size-4 text-mostaza" />
                </a>
              </span>
            </Detail>
            <Detail icon={<Clock className="size-5" />} title="Horario">
              {storeInfo.hours}
            </Detail>
            <Detail icon={<ShoppingBag className="size-5" />} title="Pedidos">
              Retiro en el local o envío a domicilio.
            </Detail>
            <Detail icon={<InstagramIcon className="size-5" />} title="Instagram">
              <InstagramLink glyph={false} className="-mt-2.5" />
            </Detail>
          </dl>

          <button
            type="button"
            onClick={onOpenInfo}
            aria-haspopup="dialog"
            className="mt-5 inline-flex min-h-12 items-center gap-2 rounded-full bg-chapa px-5 font-semibold text-crema ring-1 ring-chapa-edge transition-colors hover:bg-chapa-edge"
          >
            <Info aria-hidden="true" className="size-4.5 text-mostaza" />
            Info del local
          </button>
        </div>
      </div>
    </section>
  )
}
