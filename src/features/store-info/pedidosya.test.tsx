import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { Storefront } from '@/app/Storefront'
import { PedidosYaLink } from '@/components/ui/PedidosYaLink'
import { prototypeCategories, prototypeProducts } from '@/data/prototype-catalog'
import { pedidosYaUrl } from '@/data/store-info'
import { resetOrderStore } from '@/features/cart/order-store'
import { resetCheckoutStore } from '@/features/checkout/checkout-store'

const renderStore = () => render(<Storefront categories={prototypeCategories} products={prototypeProducts} promotions={[]} />)

describe('PedidosYa, the secondary channel (S1)', () => {
  beforeEach(() => {
    resetOrderStore()
    resetCheckoutStore()
  })

  it('points to the restaurant page the owner gave', () => {
    expect(pedidosYaUrl).toBe(
      'https://www.pedidosya.com.ar/restaurantes/campana/heraldo-pizza-ef6d3a30-7cd3-4842-924a-ecc9b7fdf69b-menu',
    )
  })

  it('appears in the footer and in the info sheet, both from the one constant', () => {
    renderStore()

    const footerLink = within(screen.getByRole('contentinfo')).getByRole('link', { name: /PedidosYa/ })
    expect(footerLink).toHaveAttribute('href', pedidosYaUrl)
    expect(footerLink).toHaveAttribute('target', '_blank')
    expect(footerLink.getAttribute('rel')).toContain('noopener')

    fireEvent.click(screen.getByRole('button', { name: 'Info del local' }))
    const info = screen.getByRole('dialog', { name: 'Heraldo Pizza' })
    expect(within(info).getByRole('link', { name: /PedidosYa/ })).toHaveAttribute('href', pedidosYaUrl)
  })

  it('never shows up in the header, the order bar, or any step of the order', () => {
    renderStore()
    expect(document.querySelector('header a[href*="pedidosya"]')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: /^Sumar Muzzarella, Entera/ }))
    expect(screen.getByRole('button', { name: /^Ver tu pedido/ }).querySelector('a')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: /^Ver tu pedido/ }))
    const sheet = screen.getByRole('dialog', { name: 'Tu pedido' })
    expect(within(sheet).queryByRole('link', { name: /PedidosYa/ })).not.toBeInTheDocument()

    fireEvent.click(within(sheet).getByRole('button', { name: 'Continuar' }))
    expect(within(sheet).queryByRole('link', { name: /PedidosYa/ })).not.toBeInTheDocument()

    fireEvent.change(within(sheet).getByLabelText('Nombre y apellido'), { target: { value: 'Ana Gómez' } })
    fireEvent.click(within(sheet).getByRole('radio', { name: 'Retiro' }))
    fireEvent.click(within(sheet).getByRole('radio', { name: 'Efectivo' }))
    fireEvent.click(screen.getByRole('button', { name: /^Ver mensaje/ }))
    expect(within(sheet).getByRole('heading', { name: 'Revisá el mensaje' })).toBeInTheDocument()
    expect(within(sheet).queryByRole('link', { name: /PedidosYa/ })).not.toBeInTheDocument()
  })
})

describe('PedidosYaLink and the official logo', () => {
  it('shows the name as text until the owner supplies the official logo file', () => {
    render(<PedidosYaLink lead="También en" />)

    const link = screen.getByRole('link', { name: 'También en PedidosYa' })
    expect(link).toHaveTextContent('PedidosYa')
    expect(link.querySelector('img')).toBeNull()
  })

  it('shows the supplied logo with the same accessible name, and no duplicated text', () => {
    render(<PedidosYaLink lead="También en" logo={{ src: '/images/brands/pedidosya.svg', width: 120, height: 24 }} />)

    const link = screen.getByRole('link', { name: 'También en PedidosYa' })
    expect(link.querySelector('img')).toHaveAttribute('src', '/images/brands/pedidosya.svg')
    expect(link.querySelector('img')).toHaveAttribute('alt', 'PedidosYa')
  })
})
