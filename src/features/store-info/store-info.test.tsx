import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { prototypeCategories, prototypeProducts } from '@/data/prototype-catalog'
import { Storefront } from '@/app/Storefront'
import { StoreHeader } from '@/features/catalog/StoreHeader'
import { SiteFooter } from './SiteFooter'
import { StoreInfoSheet } from './StoreInfoSheet'

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

describe('store header (S1)', () => {
  it('centers the brand: the name is the page heading, with address and hours below and Info on the photo', () => {
    const onOpenInfo = vi.fn()
    render(<StoreHeader onOpenInfo={onOpenInfo} />)

    expect(screen.getByRole('heading', { level: 1, name: 'Heraldo Pizza' })).toHaveClass('text-center')
    expect(screen.getByText('Av. Mitre 1130, Campana')).toBeInTheDocument()
    expect(screen.getByText('Todos los días, de 11 a 14 y de 19 a 00 h')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Info del local' }))
    expect(onOpenInfo).toHaveBeenCalledTimes(1)
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
