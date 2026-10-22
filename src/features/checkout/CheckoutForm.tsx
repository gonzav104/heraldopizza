import { CloudRain } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { useCheckoutStore } from './checkout-store'
import { RAIN_NOTICE } from './notices'
import { OrderTotalsCard } from './OrderTotalsCard'
import { ZonePicker } from './ZonePicker'
import {
  checkoutFieldOrder,
  paymentOptions,
  validateCheckout,
  type CheckoutField,
  type FulfillmentMode,
  type OrderTotals,
  type PaymentMethod,
} from './prototype-order'

export const CHECKOUT_FORM_ID = 'datos-pedido'

const fieldIds: Record<CheckoutField, string> = {
  name: 'datos-nombre',
  mode: 'datos-modalidad',
  address: 'datos-direccion',
  zone: 'datos-zona',
  payment: 'datos-pago',
}

/** Field labels: 1 rem, so every label is as legible as the 16 px text that stops iOS from zooming into inputs. */
const labelClass = 'block text-[1rem] font-bold'

const inputClass =
  'mt-2 min-h-12 w-full rounded-xl bg-chapa px-3.5 text-[1rem] ring-1 ring-chapa-edge focus-visible:ring-0 aria-invalid:ring-mostaza'

function FieldError({ id, message }: { id: string; message?: string }) {
  return message ? (
    <p id={id} className="mt-1.5 text-[0.875rem] font-semibold text-mostaza">
      {message}
    </p>
  ) : null
}

/**
 * Order details (RF-18, RF-57): name, pickup or delivery, address and zone only for delivery, payment by mode,
 * and a general note. Errors appear after the first submit attempt, and focus moves to the first invalid field.
 */
export function CheckoutForm({ totals, onValid }: { totals: OrderTotals; onValid: () => void }) {
  const { details, setText, setMode, setZone, setPayment } = useCheckoutStore()
  const [attempted, setAttempted] = useState(false)
  const errors = attempted ? validateCheckout(details) : {}

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const found = validateCheckout(details)
    const first = checkoutFieldOrder.find((field) => found[field])
    if (first) {
      setAttempted(true)
      document.getElementById(fieldIds[first])?.focus()
      return
    }
    onValid()
  }

  return (
    <form id={CHECKOUT_FORM_ID} noValidate onSubmit={submit} className="flex flex-col gap-6 p-5 sm:p-6">
      <div>
        <label htmlFor={fieldIds.name} className={labelClass}>
          Nombre y apellido
        </label>
        <input
          id={fieldIds.name}
          type="text"
          value={details.name}
          onChange={(event) => setText('name', event.target.value)}
          autoComplete="name"
          autoCapitalize="words"
          enterKeyHint="next"
          aria-invalid={errors.name ? true : undefined}
          aria-describedby={errors.name ? 'nombre-error' : undefined}
          className={inputClass}
        />
        <FieldError id="nombre-error" message={errors.name} />
      </div>

      <SegmentedControl<FulfillmentMode>
        name="modalidad"
        legend="¿Envío o retiro?"
        firstInputId={fieldIds.mode}
        options={[
          { value: 'envio', label: 'Envío' },
          { value: 'retiro', label: 'Retiro' },
        ]}
        value={details.mode}
        onChange={setMode}
        error={errors.mode}
      />

      {details.mode === 'envio' ? (
        <>
          <p className="-mt-2 flex gap-2 rounded-xl bg-chapa px-3.5 py-2.5 text-[0.875rem] leading-snug text-crema-muted ring-1 ring-chapa-edge">
            <CloudRain aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-mostaza" />
            {RAIN_NOTICE}
          </p>
          <div>
            <label htmlFor={fieldIds.address} className={labelClass}>
              Dirección
            </label>
            <input
              id={fieldIds.address}
              type="text"
              value={details.address}
              onChange={(event) => setText('address', event.target.value)}
              autoComplete="street-address"
              autoCapitalize="words"
              enterKeyHint="next"
              placeholder="Calle, número, piso o depto."
              aria-invalid={errors.address ? true : undefined}
              aria-describedby={errors.address ? 'direccion-error' : undefined}
              className={inputClass}
            />
            <FieldError id="direccion-error" message={errors.address} />
          </div>
          <ZonePicker value={details.zoneId} onChange={setZone} error={errors.zone} firstInputId={fieldIds.zone} />
        </>
      ) : null}

      {details.mode ? (
        <SegmentedControl<PaymentMethod>
          name="pago"
          legend="Forma de pago"
          firstInputId={fieldIds.payment}
          options={paymentOptions(details.mode).map((option) => ({ value: option.id, label: option.label, note: option.note }))}
          value={details.payment}
          onChange={setPayment}
          error={errors.payment}
        />
      ) : (
        <div>
          <p className={labelClass}>Forma de pago</p>
          <p id={fieldIds.payment} tabIndex={-1} className="mt-1 text-[0.9375rem] text-crema-muted">
            Elegí envío o retiro para ver las formas de pago.
          </p>
          <FieldError id="pago-error" message={errors.payment} />
        </div>
      )}

      <div>
        <label htmlFor="datos-nota" className={labelClass}>
          Nota general <span className="font-normal text-crema-muted">(opcional)</span>
        </label>
        <textarea
          id="datos-nota"
          value={details.note}
          onChange={(event) => setText('note', event.target.value)}
          maxLength={200}
          rows={2}
          placeholder="Ej.: tocar timbre, paso a las 21"
          className="mt-2 w-full resize-none rounded-xl bg-chapa px-3.5 py-3 text-[1rem] ring-1 ring-chapa-edge focus-visible:ring-0"
        />
      </div>

      <OrderTotalsCard totals={totals} />
    </form>
  )
}
