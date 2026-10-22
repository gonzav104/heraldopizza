import { useId } from 'react'
import type { PromotionErrors, PromotionForm } from '@/features/admin/promotions/promotion-edits'
import { WEEK } from '@/features/admin/promotions/promotion-labels'

/**
 * The commercial fields of a promotion (P5b), shared by the edit and create forms: title, description, price, dates,
 * and weekdays. Errors appear next to their field and name it through aria-describedby.
 */
export function PromotionFields({
  form,
  errors,
  disabled,
  onChange,
}: {
  form: PromotionForm
  errors: PromotionErrors
  disabled: boolean
  onChange: (form: PromotionForm) => void
}) {
  const id = useId()
  const set = (changes: Partial<PromotionForm>) => onChange({ ...form, ...changes })
  const error = (field: keyof PromotionErrors) =>
    errors[field] ? (
      <p id={`${id}-${field}-error`} className="admin-field-error">
        {errors[field]}
      </p>
    ) : null
  const described = (field: keyof PromotionErrors) =>
    errors[field] ? { 'aria-invalid': true, 'aria-describedby': `${id}-${field}-error` } : {}

  return (
    <fieldset disabled={disabled} className="admin-promotion-fields">
      <div className="admin-field">
        <label htmlFor={`${id}-title`}>Título</label>
        <input
          id={`${id}-title`}
          className="admin-input"
          value={form.title}
          onChange={(event) => set({ title: event.target.value })}
          {...described('title')}
        />
        {error('title')}
      </div>
      <div className="admin-field">
        <label htmlFor={`${id}-description`}>
          Descripción <span className="admin-optional">(opcional)</span>
        </label>
        <textarea
          id={`${id}-description`}
          className="admin-input admin-description"
          rows={2}
          value={form.description}
          onChange={(event) => set({ description: event.target.value })}
        />
      </div>
      <div className="admin-field admin-price-input">
        <label htmlFor={`${id}-price`}>Precio</label>
        <div className="admin-money">
          <span aria-hidden="true">$</span>
          <input
            id={`${id}-price`}
            className="admin-input"
            inputMode="numeric"
            autoComplete="off"
            value={form.price}
            onChange={(event) => set({ price: event.target.value })}
            {...described('price')}
          />
        </div>
        {error('price')}
      </div>
      <fieldset className="admin-group">
        <legend>Vigencia</legend>
        <p className="admin-group-hint">Dejá una fecha vacía si no tiene límite. Se cuenta con la hora de Argentina.</p>
        <div className="admin-date-pair">
          <div className="admin-field">
            <label htmlFor={`${id}-from`}>Desde</label>
            <input
              id={`${id}-from`}
              type="date"
              className="admin-input"
              value={form.from}
              onChange={(event) => set({ from: event.target.value })}
              {...described('from')}
            />
            {error('from')}
          </div>
          <div className="admin-field">
            <label htmlFor={`${id}-to`}>Hasta</label>
            <input
              id={`${id}-to`}
              type="date"
              className="admin-input"
              value={form.to}
              onChange={(event) => set({ to: event.target.value })}
              {...described('to')}
            />
            {error('to')}
          </div>
        </div>
      </fieldset>
      <fieldset className="admin-group" {...(errors.days ? { 'aria-describedby': `${id}-days-error` } : {})}>
        <legend>Días</legend>
        <div className="admin-choice-row">
          <label>
            <input
              type="radio"
              name={`${id}-every`}
              checked={form.everyDay}
              onChange={() => set({ everyDay: true })}
            />
            Todos los días
          </label>
          <label>
            <input
              type="radio"
              name={`${id}-every`}
              checked={!form.everyDay}
              onChange={() => set({ everyDay: false })}
            />
            Solo algunos días
          </label>
        </div>
        {!form.everyDay ? (
          <div className="admin-weekdays">
            {WEEK.map(({ day, name, short }) => (
              <label key={day} title={name}>
                <input
                  type="checkbox"
                  aria-label={name}
                  checked={form.days.includes(day)}
                  onChange={(event) =>
                    set({ days: event.target.checked ? [...form.days, day] : form.days.filter((d) => d !== day) })
                  }
                />
                <span aria-hidden="true">{short}</span>
              </label>
            ))}
          </div>
        ) : null}
        {error('days')}
      </fieldset>
    </fieldset>
  )
}
