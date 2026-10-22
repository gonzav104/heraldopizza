import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { prototypeCategories, prototypeProducts } from '@/data/prototype-catalog'
import { Storefront } from '@/app/Storefront'
import { resetOrderStore } from '@/features/cart/order-store'
import { resetCheckoutStore } from './checkout-store'
import { ORDER_CONFIRMATION_NOTICE, RAIN_NOTICE } from './notices'

async function openDetails() {
  render(<Storefront categories={prototypeCategories} products={prototypeProducts} promotions={[]} />)
  fireEvent.click(screen.getByRole('button', { name: /^Sumar Muzzarella, Entera/ }))
  fireEvent.click(screen.getByRole('button', { name: /^Ver tu pedido/ }))

  const sheet = await screen.findByRole('dialog', { name: 'Tu pedido' })
  fireEvent.click(within(sheet).getByRole('button', { name: 'Continuar' }))
  expect(within(sheet).getByRole('heading', { name: 'Tus datos' })).toBeInTheDocument()
  return sheet
}

describe('checkout prototype', () => {
  beforeEach(() => {
    resetOrderStore()
    resetCheckoutStore()
  })

  it('offers only "Otra zona (a consultar)" and hides card payments for delivery (RF-63, RN-11)', async () => {
    const sheet = await openDetails()
    fireEvent.click(within(sheet).getByRole('radio', { name: 'Envío' }))

    const zone = within(sheet).getByRole('group', { name: 'Zona' })
    expect(within(zone).getAllByRole('radio').map((radio) => radio.closest('label')?.textContent)).toEqual(['Otra zona (a consultar)'])

    const payment = within(sheet).getByRole('group', { name: 'Forma de pago' })
    expect(within(payment).getAllByRole('radio').map((radio) => radio.getAttribute('value'))).toEqual(['efectivo', 'transferencia'])

    fireEvent.click(within(sheet).getByRole('radio', { name: 'Retiro' }))
    expect(within(sheet).queryByRole('group', { name: 'Zona' })).not.toBeInTheDocument()
    expect(within(sheet).getByRole('radio', { name: /Crédito/ })).toBeInTheDocument()
    expect(within(sheet).getByRole('radio', { name: 'Débito' })).toBeInTheDocument()
  })

  it('shows errors after a submit attempt, with the address required only for delivery', async () => {
    const sheet = await openDetails()
    expect(within(sheet).queryByText('Escribí tu nombre y apellido.')).not.toBeInTheDocument()

    fireEvent.click(within(sheet).getByRole('radio', { name: 'Envío' }))
    fireEvent.click(screen.getByRole('button', { name: /^Ver mensaje/ }))
    expect(within(sheet).getByText('Escribí tu nombre y apellido.')).toBeInTheDocument()
    expect(within(sheet).getByText('Escribí la dirección para el envío.')).toBeInTheDocument()
    expect(within(sheet).getByLabelText('Nombre y apellido')).toHaveFocus()

    fireEvent.click(within(sheet).getByRole('radio', { name: 'Retiro' }))
    expect(within(sheet).queryByText('Escribí la dirección para el envío.')).not.toBeInTheDocument()
  })

  it('lays payment methods out in two columns: the sheet, not the viewport, sets their room', async () => {
    const sheet = await openDetails()
    fireEvent.click(within(sheet).getByRole('radio', { name: 'Retiro' }))
    const grid = within(sheet).getByRole('group', { name: 'Forma de pago' }).querySelector('.grid')

    expect(grid).toHaveClass('grid-cols-2')
    expect(grid?.className).not.toMatch(/grid-cols-4/)
    expect(within(sheet).getByText('+8 %')).toHaveClass('whitespace-nowrap')
  })

  it('labels the field "Nombre y apellido" and asks the keyboard for names', async () => {
    const sheet = await openDetails()
    const field = within(sheet).getByLabelText('Nombre y apellido')

    expect(field).toHaveAttribute('autocomplete', 'name')
    expect(field).toHaveAttribute('autocapitalize', 'words')
    expect(within(sheet).queryByLabelText('Nombre')).not.toBeInTheDocument()
  })

  it('shows the orientative total on the primary button, so it is in reach with one hand', async () => {
    const sheet = await openDetails()
    fireEvent.click(within(sheet).getByRole('radio', { name: 'Retiro' }))

    expect(screen.getByRole('button', { name: /^Ver mensaje.*16\.000/ })).toBeInTheDocument()
    expect(within(sheet).getAllByText(/16\.000/).length).toBeGreaterThan(1)
  })

  it('previews the WhatsApp message with sending disabled in the prototype', async () => {
    const sheet = await openDetails()
    fireEvent.change(within(sheet).getByLabelText('Nombre y apellido'), { target: { value: 'Ana Gómez' } })
    fireEvent.click(within(sheet).getByRole('radio', { name: 'Envío' }))
    fireEvent.change(within(sheet).getByLabelText('Dirección'), { target: { value: 'Rivadavia 100' } })
    fireEvent.click(within(sheet).getByRole('radio', { name: 'Otra zona (a consultar)' }))
    fireEvent.click(within(sheet).getByRole('radio', { name: 'Efectivo' }))
    expect(within(sheet).getByText(/Recargo por pizza \(1 ×/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /^Ver mensaje/ }))

    expect(within(sheet).getByRole('heading', { name: 'Revisá el mensaje' })).toBeInTheDocument()
    expect(within(sheet).getByText(/\*Pedido para Heraldo Pizza\*/)).toHaveTextContent(/Zona: Otra zona \(a consultar\)/)
    expect(screen.getByRole('button', { name: 'Continuar en WhatsApp' })).toBeDisabled()
    expect(document.querySelector('a[href*="wa.me"]')).toBeNull()
  })

  it('says right beside the WhatsApp button that nothing is confirmed automatically (S3)', async () => {
    const sheet = await openDetails()
    fireEvent.change(within(sheet).getByLabelText('Nombre y apellido'), { target: { value: 'Ana Gómez' } })
    fireEvent.click(within(sheet).getByRole('radio', { name: 'Retiro' }))
    fireEvent.click(within(sheet).getByRole('radio', { name: 'Efectivo' }))
    fireEvent.click(screen.getByRole('button', { name: /^Ver mensaje/ }))

    const button = screen.getByRole('button', { name: 'Continuar en WhatsApp' })
    const notice = within(sheet).getByText(ORDER_CONFIRMATION_NOTICE)

    expect(notice).toHaveTextContent(/se abrirá WhatsApp con tu pedido preparado/)
    expect(notice).toHaveTextContent(/no queda confirmado automáticamente/)
    expect(notice).toHaveTextContent(/verificará la disponibilidad y coordinará los detalles/)
    expect(notice.parentElement).toContainElement(button)
    expect(notice.compareDocumentPosition(button) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(button).toHaveAccessibleDescription(/no queda confirmado automáticamente/)
    expect(within(sheet).queryByRole('checkbox')).not.toBeInTheDocument()
  })

  it('shows the rain notice only for delivery, as information without any amount', async () => {
    const sheet = await openDetails()
    expect(within(sheet).queryByText(RAIN_NOTICE)).not.toBeInTheDocument()

    fireEvent.click(within(sheet).getByRole('radio', { name: 'Envío' }))
    expect(RAIN_NOTICE).toBe(
      'Los días de lluvia, el servicio de reparto puede cobrar un adicional. El local te lo confirma antes de completar el pedido.',
    )
    expect(within(sheet).getByText(RAIN_NOTICE)).toBeInTheDocument()
    expect(within(sheet).getByRole('region', { name: 'Resumen del pedido' })).not.toHaveTextContent(/lluvia/i)

    fireEvent.click(within(sheet).getByRole('radio', { name: 'Retiro' }))
    expect(within(sheet).queryByText(RAIN_NOTICE)).not.toBeInTheDocument()
  })

  it('calls the delivery total partial, says what it leaves out, and keeps the amount off the button', async () => {
    const sheet = await openDetails()
    fireEvent.click(within(sheet).getByRole('radio', { name: 'Envío' }))
    const summary = within(sheet).getByRole('region', { name: 'Resumen del pedido' })

    expect(summary).toHaveTextContent(/EnvíoA confirmar/)
    expect(summary).toHaveTextContent(/Total parcial\$\s17\.000/)
    expect(summary).toHaveTextContent('No incluye el envío: el local lo confirma.')
    expect(summary).not.toHaveTextContent(/Total orientativo/)
    expect(screen.getByRole('button', { name: 'Ver mensaje' })).toBeInTheDocument()
  })

  it('writes in the message exactly the rows the summary shows', async () => {
    const sheet = await openDetails()
    fireEvent.change(within(sheet).getByLabelText('Nombre y apellido'), { target: { value: 'Ana Gómez' } })
    fireEvent.click(within(sheet).getByRole('radio', { name: 'Envío' }))
    fireEvent.change(within(sheet).getByLabelText('Dirección'), { target: { value: 'Rivadavia 100' } })
    fireEvent.click(within(sheet).getByRole('radio', { name: 'Otra zona (a consultar)' }))
    fireEvent.click(within(sheet).getByRole('radio', { name: 'Transferencia' }))
    const summary = within(sheet).getByRole('region', { name: 'Resumen del pedido' })
    const rows = within(summary)
      .getAllByRole('term')
      .map((term) => `${term.textContent}: ${term.nextElementSibling?.textContent}`)

    fireEvent.click(screen.getByRole('button', { name: /^Ver mensaje/ }))
    const message = within(sheet).getByText(/\*Pedido para Heraldo Pizza\*/).textContent ?? ''

    expect(rows).toEqual([
      expect.stringMatching(/^Productos: \$\s16\.000$/),
      expect.stringMatching(/^Recargo por pizza \(1 × \$\s1\.000\): \$\s1\.000$/),
      'Envío: A confirmar',
      expect.stringMatching(/^Total parcial: \$\s17\.000$/),
    ])
    for (const row of rows.slice(0, -1)) expect(message).toContain(row)
    expect(message).toContain(`*${rows[rows.length - 1]}*`)
    expect(message).toContain('No incluye el envío: el local lo confirma.')
  })
})
