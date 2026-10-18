import { fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { prototypeCategories, prototypeProducts } from '@/data/prototype-catalog'
import { Storefront } from '@/app/Storefront'
import { StoreHeader } from '@/features/catalog/StoreHeader'
import { SiteFooter } from './SiteFooter'
import { StoreInfoSheet } from './StoreInfoSheet'
import { VenueSection } from './VenueSection'

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

const VIDEO_SRC = '/videos/gemini_generated_video_720ff841.mp4'
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
    render(<StoreHeader onOpenInfo={() => {}} />)

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

  it('keeps the brand, a short phrase, and the main actions off the video', () => {
    const onOpenInfo = vi.fn()
    render(<StoreHeader onOpenInfo={onOpenInfo} />)
    const media = screen.getByRole('img', { name: MEDIA_LABEL })

    const heading = screen.getByRole('heading', { level: 1, name: 'Heraldo Pizza' })
    const cta = screen.getByRole('link', { name: 'Ver la carta' })
    expect(media).not.toContainElement(heading)
    expect(media).not.toContainElement(cta)
    expect(cta).toHaveAttribute('href', '#carta')
    expect(screen.getByText('Pizzas, empanadas, milanesas ¡y mucho más!')).toBeInTheDocument()
    expect(screen.getByText('Av. Mitre 1130, Campana')).toBeInTheDocument()
    expect(screen.getByText('Todos los días, de 11 a 14 y de 19 a 00 h')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Info del local' }))
    expect(onOpenInfo).toHaveBeenCalledTimes(1)
  })

  it('lets the animation be paused and played again (WCAG 2.2.2)', () => {
    const pause = vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined)
    const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined)
    render(<StoreHeader onOpenInfo={() => {}} />)
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
    render(<StoreHeader onOpenInfo={() => {}} />)
    const media = screen.getByRole('img', { name: MEDIA_LABEL })

    expect(media.querySelector('video')).toBeNull()
    expect(media.querySelector('img')).toHaveAttribute('src', POSTER)
    expect(screen.queryByRole('button', { name: /la animación/ })).not.toBeInTheDocument()
  })

  it('shows the still poster, with no video, when the visitor is saving data', () => {
    vi.stubGlobal('navigator', { ...navigator, connection: { saveData: true } })
    render(<StoreHeader onOpenInfo={() => {}} />)
    const media = screen.getByRole('img', { name: MEDIA_LABEL })

    expect(media.querySelector('video')).toBeNull()
    expect(media.querySelector('img')).toHaveAttribute('src', POSTER)
  })

  it('falls back to the still poster if the video fails to load', () => {
    preferReducedMotion(false)
    render(<StoreHeader onOpenInfo={() => {}} />)
    const media = screen.getByRole('img', { name: MEDIA_LABEL })

    fireEvent.error(media.querySelector('video') as HTMLVideoElement)

    expect(media.querySelector('video')).toBeNull()
    expect(media.querySelector('img')).toHaveAttribute('src', POSTER)
  })
})

describe('venue section (S8)', () => {
  it('shows the real dining room in its own section, with the address and directions', () => {
    render(<VenueSection />)
    const section = screen.getByRole('region', { name: 'El local' })

    expect(within(section).getByRole('img', { name: 'Salón de Heraldo Pizza: chapa negra, madera de pino y la barra' })).toHaveAttribute(
      'loading',
      'lazy',
    )
    expect(within(section).getByText('Av. Mitre 1130, Campana')).toBeInTheDocument()
    expect(within(section).getByRole('link', { name: 'Cómo llegar' })).toHaveAttribute('target', '_blank')
  })

  it('sits after the menu, so the brand video and the menu stay first', () => {
    render(<Storefront categories={prototypeCategories} products={prototypeProducts} promotions={[]} />)
    const venue = screen.getByRole('region', { name: 'El local' })
    const pizzas = screen.getByRole('heading', { level: 2, name: 'Pizzas' })

    expect(pizzas.compareDocumentPosition(venue) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(screen.getByRole('main')).toHaveAttribute('id', 'carta')
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
