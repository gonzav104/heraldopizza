import { fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { prototypeCategories, prototypeProducts } from '@/data/prototype-catalog'
import { Storefront } from '@/app/Storefront'
import { StoreHeader } from '@/features/catalog/StoreHeader'
import { SiteFooter } from './SiteFooter'
import { StoreInfoSheet } from './StoreInfoSheet'
import { LocalSection } from './LocalSection'
import { prototypePromotions } from '@/data/prototype-promotions'

describe('store info (D7, D8, D9)', () => {
  it('presents the essentials: name, place, hours, contact, how to order, payments, and delivery', () => {
    render(<StoreInfoSheet open onClose={() => {}} />)
    const sheet = screen.getByRole('dialog', { name: 'Heraldo Pizza' })

    expect(within(sheet).getByText('Av. Mitre 1130, Campana')).toBeInTheDocument()
    expect(within(sheet).getByRole('link', { name: 'Cómo llegar' })).toHaveAttribute('target', '_blank')
    expect(within(sheet).getByText('Todos los días, de 11 a 14 y de 19 a 00 h')).toBeInTheDocument()
    expect(within(sheet).getByText('WhatsApp: 11 7058-2325')).toBeInTheDocument()
    expect(within(sheet).getByText(/Los pedidos se coordinan y se confirman por WhatsApp/)).toBeInTheDocument()
    expect(within(sheet).getByText('Retiro en el local o envío a domicilio.')).toBeInTheDocument()
    expect(within(sheet).getByText('Envío: efectivo o transferencia.')).toBeInTheDocument()
    expect(within(sheet).getByText('Retiro: efectivo, transferencia, débito o crédito (el crédito suma un 8 %).')).toBeInTheDocument()
    expect(within(sheet).getByText(/El costo del envío depende de tu zona y lo confirma el local por WhatsApp/)).toBeInTheDocument()
    expect(within(sheet).getByText(/Cada pizza \(entera, media o mitad y mitad\) suma \$\s1\.000 en los envíos/)).toBeInTheDocument()
    expect(within(sheet).getByText('No hay pedido mínimo.')).toBeInTheDocument()
    expect(within(sheet).getByRole('link', { name: 'Instagram de Heraldo Pizza (@heraldopizza)' })).toHaveAttribute(
      'href',
      'https://www.instagram.com/heraldopizza/',
    )
  })

  it('publishes nothing the owner has not confirmed: no zone prices, no rain or night surcharge, no salon notes', () => {
    render(<StoreInfoSheet open onClose={() => {}} />)

    expect(screen.queryByText(/lluvia|nocturno|00:00|2\.500|18\.000|10\.000/)).not.toBeInTheDocument()
    expect(screen.queryByText(/salón|mozo/i)).not.toBeInTheDocument()
  })

  it('never links to WhatsApp anywhere on the page, footer included', () => {
    render(<Storefront categories={prototypeCategories} products={prototypeProducts} promotions={[]} />)

    expect(screen.getByRole('contentinfo')).toHaveTextContent('WhatsApp: 11 7058-2325')
    expect(document.querySelector('a[href*="wa.me"], a[href*="whatsapp"]')).toBeNull()
  })
})

// The web encode of the owner's video (H.264, no audio, faststart); the original stays in the repo as the source.
const VIDEO_SRC = '/videos/heraldo-video-720p.mp4'
const POSTER = '/images/hero/heraldo-video-poster-1280.webp'
const MEDIA_LABEL = 'Animación de Heraldo: el personaje presenta pizzas, empanadas, milanesas ¡y mucho más!'

/** jsdom has no matchMedia: report the given reduced-motion preference. */
function preferReducedMotion(reduce: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: reduce && query.includes('prefers-reduced-motion'),
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }))
}

describe('store header with the brand video (S8)', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('plays the provided video, muted and looping inline, over its own poster, as a described brand animation', () => {
    render(<StoreHeader />)

    const media = screen.getByRole('img', { name: MEDIA_LABEL })
    const video = media.querySelector('video')
    expect(video).not.toBeNull()
    expect(video).toHaveAttribute('src', VIDEO_SRC)
    expect(video).toHaveAttribute('poster', POSTER)
    expect(video).toHaveAttribute('autoplay')
    expect(video).toHaveAttribute('loop')
    expect(video).toHaveAttribute('playsinline')
    expect(video?.muted).toBe(true)
    expect(video?.className).toContain('object-cover')
  })

  it('keeps the hero clean: the brand and a short phrase off the video, and no call to action', () => {
    render(<StoreHeader />)
    const media = screen.getByRole('img', { name: MEDIA_LABEL })

    const heading = screen.getByRole('heading', { level: 1, name: 'Heraldo Pizza' })
    expect(media).not.toContainElement(heading)
    expect(screen.getByText('Pizzas, empanadas, milanesas ¡y mucho más!')).toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /carta|Info/ })).not.toBeInTheDocument()
  })

  it('lets the animation be paused and played again (WCAG 2.2.2)', () => {
    const pause = vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined)
    const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined)
    render(<StoreHeader />)
    const video = screen.getByRole('img', { name: MEDIA_LABEL }).querySelector('video') as HTMLVideoElement

    fireEvent.play(video)
    fireEvent.click(screen.getByRole('button', { name: 'Pausar la animación' }))
    expect(pause).toHaveBeenCalledTimes(1)

    fireEvent.pause(video)
    fireEvent.click(screen.getByRole('button', { name: 'Reproducir la animación' }))
    expect(play).toHaveBeenCalledTimes(1)
  })

  it('shows the still poster, with no video and no controls, when the visitor prefers reduced motion', () => {
    preferReducedMotion(true)
    render(<StoreHeader />)
    const media = screen.getByRole('img', { name: MEDIA_LABEL })

    expect(media.querySelector('video')).toBeNull()
    expect(media.querySelector('img')).toHaveAttribute('src', POSTER)
    expect(screen.queryByRole('button', { name: /la animación/ })).not.toBeInTheDocument()
  })

  it('shows the still poster, with no video, when the visitor is saving data', () => {
    vi.stubGlobal('navigator', { ...navigator, connection: { saveData: true } })
    render(<StoreHeader />)
    const media = screen.getByRole('img', { name: MEDIA_LABEL })

    expect(media.querySelector('video')).toBeNull()
    expect(media.querySelector('img')).toHaveAttribute('src', POSTER)
  })

  it('falls back to the still poster if the video fails to load', () => {
    preferReducedMotion(false)
    render(<StoreHeader />)
    const media = screen.getByRole('img', { name: MEDIA_LABEL })

    fireEvent.error(media.querySelector('video') as HTMLVideoElement)

    expect(media.querySelector('video')).toBeNull()
    expect(media.querySelector('img')).toHaveAttribute('src', POSTER)
  })
})

const FACADE_ALT = 'Fachada de Heraldo Pizza de noche: chapa negra, el cartel con el logo en luz roja y la entrada iluminada'

describe('local section with the real facade (S10)', () => {
  it('shows the provided facade photo at its own vertical proportions, described', () => {
    render(<LocalSection onOpenInfo={() => {}} />)
    const section = screen.getByRole('region', { name: 'El local' })
    const photo = within(section).getByRole('img', { name: FACADE_ALT })

    // The web versions of the owner's photo (900 and 600 px wide); the 1.8 MB original is kept only as the source.
    expect(photo).toHaveAttribute('src', '/images/local/local-heraldo-pizza-900.webp')
    expect(photo).toHaveAttribute(
      'srcset',
      '/images/local/local-heraldo-pizza-600.webp 600w, /images/local/local-heraldo-pizza-900.webp 900w',
    )
    expect(photo).toHaveAttribute('width', '900')
    expect(photo).toHaveAttribute('height', '1200')
  })

  it('tells the owner’s story with the owner’s own text, and the two projects before Campana as a side note', () => {
    render(<LocalSection onOpenInfo={() => {}} />)
    const section = screen.getByRole('region', { name: 'El local' })

    expect(section).toHaveTextContent(
      'Heraldo Pizza llegó a Campana en 2024, pero la historia detrás del horno empezó mucho antes. Heraldo Velazquez, su fundador, lleva más de 15 años trabajando como pizzero y construyendo experiencia en distintos proyectos gastronómicos. Hoy esa trayectoria continúa en Campana, con una propuesta propia y una identidad marcada por la pizza, el barrio y el oficio.',
    )
    expect(within(section).getByText('Antes de Campana pasó por proyectos como Qatar, en San Pedro, y ChavosBar.')).toBeInTheDocument()
  })

  it('carries only real facts: address with directions, hours, how to order, Instagram, and the full info', () => {
    const onOpenInfo = vi.fn()
    render(<LocalSection onOpenInfo={onOpenInfo} />)
    const section = screen.getByRole('region', { name: 'El local' })

    expect(within(section).getByText('Av. Mitre 1130, Campana')).toBeInTheDocument()
    expect(within(section).getByRole('link', { name: 'Cómo llegar' })).toHaveAttribute('target', '_blank')
    expect(within(section).getByText('Todos los días, de 11 a 14 y de 19 a 00 h')).toBeInTheDocument()
    expect(within(section).getByText('Retiro en el local o envío a domicilio.')).toBeInTheDocument()
    expect(within(section).getByRole('link', { name: 'Instagram de Heraldo Pizza (@heraldopizza)' })).toHaveAttribute(
      'href',
      'https://www.instagram.com/heraldopizza/',
    )
    fireEvent.click(within(section).getByRole('button', { name: 'Info del local' }))
    expect(onOpenInfo).toHaveBeenCalledTimes(1)
  })

  it('tells the story in order: brand video, the local, promos, then the menu', () => {
    render(<Storefront categories={prototypeCategories} products={prototypeProducts} promotions={prototypePromotions} />)
    const brand = screen.getByRole('heading', { level: 1, name: 'Heraldo Pizza' })
    const local = screen.getByRole('heading', { level: 2, name: 'El local' })
    const promos = screen.getByRole('heading', { level: 2, name: 'Promos' })
    const pizzas = screen.getByRole('heading', { level: 2, name: 'Pizzas' })
    const follows = (a: Element, b: Element) => Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING)

    expect(follows(brand, local)).toBe(true)
    expect(follows(local, promos)).toBe(true)
    expect(follows(promos, pizzas)).toBe(true)
    expect(screen.queryByRole('img', { name: /Salón de Heraldo Pizza/ })).not.toBeInTheDocument()
  })
})

describe('site footer (S3)', () => {
  it('has the brand and only the essential contact, with the real Instagram profile', () => {
    render(<SiteFooter onOpenPrivacy={() => {}} />)
    const footer = screen.getByRole('contentinfo')

    expect(within(footer).getByText('Heraldo Pizza')).toBeInTheDocument()
    expect(within(footer).getByRole('link', { name: 'Cómo llegar: Av. Mitre 1130, Campana' })).toHaveAttribute('target', '_blank')
    expect(within(footer).getByText('WhatsApp: 11 7058-2325')).toBeInTheDocument()
    expect(within(footer).getByRole('link', { name: 'Instagram de Heraldo Pizza (@heraldopizza)' })).toHaveAttribute(
      'href',
      'https://www.instagram.com/heraldopizza/',
    )
    expect(within(footer).getByText(/El total es orientativo/)).toBeInTheDocument()
  })

  it('does not repeat the opening hours that the header and the info sheet already show', () => {
    render(<SiteFooter onOpenPrivacy={() => {}} />)

    expect(screen.queryByText(/Todos los días/)).not.toBeInTheDocument()
  })
})
