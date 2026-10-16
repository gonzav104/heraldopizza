import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Storefront } from '@/app/Storefront'
import { prototypeCategories, prototypeProducts } from '@/data/prototype-catalog'

function openPrivacy() {
  render(<Storefront categories={prototypeCategories} products={prototypeProducts} promotions={[]} />)
  fireEvent.click(within(screen.getByRole('contentinfo')).getByRole('button', { name: 'Privacidad' }))
  return screen.getByRole('dialog', { name: 'Privacidad' })
}

describe('privacy notice (S2)', () => {
  it('opens from the footer and is organized in short, labeled topics', () => {
    const dialog = openPrivacy()

    expect(within(dialog).getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent)).toEqual([
      'Qué datos te pedimos',
      'Para qué los usamos',
      'Vos decidís si lo enviás',
      'Si lo enviás',
      'Consultas sobre tus datos',
    ])
  })

  it('says which data the customer gives, and which are optional', () => {
    const text = openPrivacy().textContent ?? ''

    expect(text).toMatch(/nombre y apellido/)
    expect(text).toMatch(/envío o retiro/)
    expect(text).toMatch(/dirección/)
    expect(text).toMatch(/forma de pago/)
    expect(text).toMatch(/opcionales/)
  })

  it('explains the WhatsApp flow: the message is built from the data, and the customer decides to send', () => {
    const text = openPrivacy().textContent ?? ''

    expect(text).toMatch(/armar el mensaje de WhatsApp/)
    expect(text).toMatch(/Hasta que lo envíes desde WhatsApp, Heraldo Pizza no recibe nada/)
    expect(text).toMatch(/tus datos los recibe Heraldo Pizza/)
    expect(text).toMatch(/también se tratan a través de WhatsApp/)
  })

  it('tells how to ask about the data, with channels that exist and a real profile link', () => {
    const dialog = openPrivacy()

    expect(within(dialog).getByText(/11 7058-2325/)).toBeInTheDocument()
    expect(within(dialog).getByText(/Av\. Mitre 1130, Campana/)).toBeInTheDocument()
    expect(within(dialog).getByRole('link', { name: 'Instagram de Heraldo Pizza (@heraldopizza)' })).toHaveAttribute(
      'href',
      'https://www.instagram.com/heraldopizza/',
    )
  })

  it('claims only what the app really does: no cookies or analytics, and nothing stored on a server', () => {
    const text = openPrivacy().textContent ?? ''

    expect(text).toMatch(/no usa cookies, ni herramientas de análisis o publicidad/)
    expect(text).toMatch(/no lo envía a ningún servidor/)
    expect(text).not.toMatch(/no se almacenan|no guardamos|no se guardan|anónimo/i)
  })

  it('does not invent legal data the business has not given', () => {
    const text = openPrivacy().textContent ?? ''

    expect(text).not.toMatch(/CUIT|CUIL|razón social|S\.R\.L|S\.A\.|Ley N|@[\w-]+\.(com|ar)/i)
  })
})
