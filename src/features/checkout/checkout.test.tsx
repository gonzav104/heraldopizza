import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { prototypeCategories, prototypeProducts } from '@/data/prototype-catalog'
import { Storefront } from '@/app/Storefront'
import { resetOrderStore } from '@/features/cart/order-store'
import { resetCheckoutStore } from './checkout-store'
import { DELIVERY_RATES_NOTE, NIGHT_NOTICE, ORDER_CONFIRMATION_NOTICE, RAIN_NOTICE } from './notices'

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

  it('asks for no zone, and offers only cash and transfer for delivery (RN-11)', async () => {
    const sheet = await openDetails()
    fireEvent.click(within(sheet).getByRole('radio', { name: 'Envío' }))

    expect(within(sheet).queryByRole('group', { name: 'Zona' })).not.toBeInTheDocument()
    expect(within(sheet).getByLabelText('Dirección')).toBeInTheDocument()
    const payment = within(sheet).getByRole('group', { name: 'Forma de pago' })
    expect(within(payment).getAllByRole('radio').map((radio) => radio.getAttribute('value'))).toEqual(['efectivo', 'transferencia'])

    fireEvent.click(within(sheet).getByRole('radio', { name: 'Retiro' }))
    expect(within(sheet).queryByLabelText('Dirección')).not.toBeInTheDocument()
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
    fireEvent.change(within(sheet).getByLabelText('Dirección'), { target: { value: 'Rivadavia 100, Barrio Centro' } })
    fireEvent.click(within(sheet).getByRole('radio', { name: 'Efectivo' }))

    fireEvent.click(screen.getByRole('button', { name: /^Ver mensaje/ }))

    expect(within(sheet).getByRole('heading', { name: 'Revisá el mensaje' })).toBeInTheDocument()
    const message = within(sheet).getByText(/\*Pedido para Heraldo Pizza\*/)
    expect(message).toHaveTextContent('Dirección: Rivadavia 100, Barrio Centro')
    expect(message).not.toHaveTextContent(/Zona|Recargo por pizza/)
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

  it('shows the rain and after-midnight notices only for delivery, as information without any amount in the order', async () => {
    const sheet = await openDetails()
    expect(within(sheet).queryByText(RAIN_NOTICE)).not.toBeInTheDocument()
    expect(within(sheet).queryByText(NIGHT_NOTICE)).not.toBeInTheDocument()

    fireEvent.click(within(sheet).getByRole('radio', { name: 'Envío' }))
    expect(RAIN_NOTICE).toBe('Lluvia: puede aplicarse un adicional de $1.000 si llueve al momento del retiro')
    expect(NIGHT_NOTICE).toBe('Después de las 00:00: puede aplicarse un adicional de $1.000 hasta finalizar el turno')
    expect(within(sheet).getByText(RAIN_NOTICE)).toBeInTheDocument()
    expect(within(sheet).getByText(NIGHT_NOTICE)).toBeInTheDocument()
    const summary = within(sheet).getByRole('region', { name: 'Resumen del pedido' })
    expect(summary).not.toHaveTextContent(/lluvia|00:00/i)
    expect(summary).toHaveTextContent(/Total orientativo\$\s16\.000/)

    fireEvent.click(within(sheet).getByRole('radio', { name: 'Retiro' }))
    expect(within(sheet).queryByText(RAIN_NOTICE)).not.toBeInTheDocument()
    expect(within(sheet).queryByText(NIGHT_NOTICE)).not.toBeInTheDocument()
  })

  it('keeps the motito out of the total for delivery, with no per-pizza surcharge, and says it is paid apart', async () => {
    const sheet = await openDetails()
    fireEvent.click(within(sheet).getByRole('radio', { name: 'Envío' }))
    const summary = within(sheet).getByRole('region', { name: 'Resumen del pedido' })

    expect(summary).toHaveTextContent(/Reparto en motitoSe paga aparte/)
    expect(summary).toHaveTextContent(/Total orientativo\$\s16\.000/)
    expect(summary).toHaveTextContent('No incluye el reparto en motito: se paga aparte, con tarifa según el destino, y lo confirma el local.')
    expect(summary).not.toHaveTextContent(/pizza|A confirmar|parcial/i)
    expect(screen.getByRole('button', { name: /^Ver mensaje.*16\.000/ })).toBeInTheDocument()
  })

  it('opens «Tarifas de la motito» from delivery as its own view, searchable, and comes back with the data kept', async () => {
    const sheet = await openDetails()
    expect(within(sheet).queryByRole('button', { name: 'Consultar tarifas de reparto' })).not.toBeInTheDocument()
    fireEvent.change(within(sheet).getByLabelText('Nombre y apellido'), { target: { value: 'Ana Gómez' } })
    fireEvent.click(within(sheet).getByRole('radio', { name: 'Envío' }))

    fireEvent.click(within(sheet).getByRole('button', { name: 'Consultar tarifas de reparto' }))

    expect(within(sheet).getByRole('heading', { level: 2, name: 'Tarifas de la motito' })).toBeInTheDocument()
    const barrios = within(sheet).getByRole('region', { name: 'Barrios y localidades' })
    const fabricas = within(sheet).getByRole('region', { name: 'Fábricas' })
    expect(within(barrios).getAllByRole('listitem')).toHaveLength(14)
    expect(within(fabricas).getAllByRole('listitem')).toHaveLength(9)
    expect(within(sheet).getByText(DELIVERY_RATES_NOTE)).toBeInTheDocument()

    fireEvent.change(within(sheet).getByRole('searchbox', { name: 'Buscá un barrio, localidad o fábrica' }), { target: { value: 'siderca' } })
    expect(within(within(sheet).getByRole('region', { name: 'Barrios y localidades' })).getByRole('listitem')).toHaveTextContent(/^Siderca\$\s3\.000$/)
    expect(within(within(sheet).getByRole('region', { name: 'Fábricas' })).getByRole('listitem')).toHaveTextContent(/^Siderca\$\s3\.500$/)

    fireEvent.change(within(sheet).getByRole('searchbox'), { target: { value: 'Rosario' } })
    expect(within(sheet).getByText('No encontramos «Rosario» en la lista. Consultá la tarifa al local.')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Volver a tus datos' }))
    expect(within(sheet).getByRole('heading', { name: 'Tus datos' })).toBeInTheDocument()
    expect(within(sheet).getByLabelText('Nombre y apellido')).toHaveValue('Ana Gómez')
    expect(within(sheet).getByRole('radio', { name: 'Envío' })).toBeChecked()
  })

  it('«Volver a tus datos» only goes back, even with complete details: it never submits the form', async () => {
    const sheet = await openDetails()
    fireEvent.change(within(sheet).getByLabelText('Nombre y apellido'), { target: { value: 'Ana Gómez' } })
    fireEvent.click(within(sheet).getByRole('radio', { name: 'Envío' }))
    fireEvent.change(within(sheet).getByLabelText('Dirección'), { target: { value: 'Rivadavia 100' } })
    fireEvent.click(within(sheet).getByRole('radio', { name: 'Efectivo' }))
    fireEvent.click(within(sheet).getByRole('button', { name: 'Consultar tarifas de reparto' }))

    const back = screen.getByRole('button', { name: 'Volver a tus datos' })
    fireEvent.click(back)

    expect(within(sheet).getByRole('heading', { name: 'Tus datos' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Ver mensaje/ })).not.toBe(back)
  })

  it('starts the rates view and the form from the top, keeping the data and never submitting (Codex P2)', async () => {
    const sheet = await openDetails()
    fireEvent.change(within(sheet).getByLabelText('Nombre y apellido'), { target: { value: 'Ana Gómez' } })
    fireEvent.click(within(sheet).getByRole('radio', { name: 'Envío' }))
    fireEvent.change(within(sheet).getByLabelText('Dirección'), { target: { value: 'Rivadavia 100' } })
    fireEvent.click(within(sheet).getByRole('radio', { name: 'Efectivo' }))
    // The sheet body is the scroll container; jsdom does not scroll, so its position is set by hand.
    const body = sheet.querySelector<HTMLElement>('.overflow-y-auto')
    if (!body) throw new Error('sheet body')
    Object.defineProperty(body, 'scrollTop', { value: 420, writable: true, configurable: true })

    fireEvent.click(within(sheet).getByRole('button', { name: 'Consultar tarifas de reparto' }))
    expect(within(sheet).getByRole('heading', { level: 2, name: 'Tarifas de la motito' })).toBeInTheDocument()
    expect(body.scrollTop).toBe(0)

    body.scrollTop = 900
    fireEvent.click(screen.getByRole('button', { name: 'Volver a tus datos' }))

    expect(within(sheet).getByRole('heading', { name: 'Tus datos' })).toBeInTheDocument()
    expect(body.scrollTop).toBe(0)
    expect(within(sheet).getByLabelText('Nombre y apellido')).toHaveValue('Ana Gómez')
    expect(within(sheet).getByLabelText('Dirección')).toHaveValue('Rivadavia 100')
    expect(within(sheet).getByRole('radio', { name: 'Efectivo' })).toBeChecked()
    expect(within(sheet).getByRole('heading', { name: 'Tus datos' })).toHaveFocus()
  })

  it('writes in the message exactly the rows the summary shows', async () => {
    const sheet = await openDetails()
    fireEvent.change(within(sheet).getByLabelText('Nombre y apellido'), { target: { value: 'Ana Gómez' } })
    fireEvent.click(within(sheet).getByRole('radio', { name: 'Envío' }))
    fireEvent.change(within(sheet).getByLabelText('Dirección'), { target: { value: 'Rivadavia 100' } })
    fireEvent.click(within(sheet).getByRole('radio', { name: 'Transferencia' }))
    const summary = within(sheet).getByRole('region', { name: 'Resumen del pedido' })
    const rows = within(summary)
      .getAllByRole('term')
      .map((term) => `${term.textContent}: ${term.nextElementSibling?.textContent}`)

    fireEvent.click(screen.getByRole('button', { name: /^Ver mensaje/ }))
    const message = within(sheet).getByText(/\*Pedido para Heraldo Pizza\*/).textContent ?? ''

    expect(rows).toEqual([
      expect.stringMatching(/^Productos: \$\s16\.000$/),
      'Reparto en motito: Se paga aparte',
      expect.stringMatching(/^Total orientativo: \$\s16\.000$/),
    ])
    for (const row of rows.slice(0, -1)) expect(message).toContain(row)
    expect(message).toContain(`*${rows[rows.length - 1]}*`)
    expect(message).toContain('No incluye el reparto en motito: se paga aparte, con tarifa según el destino, y lo confirma el local.')
  })
})
