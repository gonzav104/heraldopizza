import { useEffect, useId, useState, type FormEvent } from 'react'
import { Sheet } from '@/components/ui/Sheet'
import type { AdminPromotion, AdminPromotionsRepository, NewPromotion as Kind } from '@/features/admin/promotions/admin-promotions'
import { PromotionFields } from '@/features/admin/promotions/PromotionFields'
import { emptyPromotionForm, validatePromotionForm, type PromotionErrors } from '@/features/admin/promotions/promotion-edits'
import { PROMOTIONS_SCOPE } from '@/features/admin/promotions/promotion-labels'
import { useSave } from '@/features/admin/shared/use-save'

const KINDS: { kind: Kind['kind']; label: string; hint: string }[] = [
  { kind: 'closed', label: 'Combo cerrado', hint: 'Productos fijos, descriptos en el título y la descripción.' },
  {
    kind: 'dozen',
    label: 'Docena de empanadas a elección (12)',
    hint: 'El cliente elige los gustos de 12 empanadas en la carta.',
  },
]

/**
 * The create sheet of the promotions section (P5b): a closed combo or the dozen of 12 empanadas to choose, the only
 * configurator the menu has. It is created switched off; the database generates its code. The draft survives closing
 * the sheet and counts as pending work until it is created or discarded.
 */
export function NewPromotion({
  open,
  onClose,
  nextOrder,
  repository,
  onCreated,
  onReload,
  onWorkChange,
}: {
  open: boolean
  onClose: () => void
  nextOrder: number
  repository: AdminPromotionsRepository
  onCreated: (created: AdminPromotion) => void
  onReload: () => void
  onWorkChange: (work: { dirty: boolean; saving: boolean }) => void
}) {
  const titleId = useId()
  const kindName = useId()
  const [kind, setKind] = useState<Kind['kind']>('closed')
  const [form, setForm] = useState(emptyPromotionForm)
  const [errors, setErrors] = useState<PromotionErrors>({})
  const save = useSave(onReload, 'Alta', PROMOTIONS_SCOPE)
  const dirty = kind !== 'closed' || JSON.stringify(form) !== JSON.stringify(emptyPromotionForm)
  useEffect(() => onWorkChange({ dirty, saving: save.saving }), [dirty, save.saving, onWorkChange])

  const reset = () => {
    setKind('closed')
    setForm(emptyPromotionForm)
    setErrors({})
    save.clear()
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const result = validatePromotionForm(form)
    if (!result.ok) {
      setErrors(result.errors)
      return
    }
    setErrors({})
    void save.run(async () => {
      const created = await repository.create({ kind, ...result.values }, nextOrder)
      onCreated(created)
      reset()
      onClose()
    })
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      labelledBy={titleId}
      dismissOnBackdrop={false}
      header={
        <div>
          <h2 id={titleId}>Nueva promoción</h2>
        </div>
      }
    >
      {open ? (
        <form className="admin-data-form" noValidate onSubmit={submit}>
          <fieldset className="admin-group" disabled={save.saving}>
            <legend>Tipo</legend>
            {KINDS.map((option) => (
              <label key={option.kind} className="admin-kind">
                <input
                  type="radio"
                  name={kindName}
                  aria-label={option.label}
                  aria-describedby={`${kindName}-${option.kind}`}
                  checked={kind === option.kind}
                  onChange={() => setKind(option.kind)}
                />
                <span>
                  <strong aria-hidden="true">{option.label}</strong>
                  <span id={`${kindName}-${option.kind}`} className="admin-group-hint">
                    {option.hint}
                  </span>
                </span>
              </label>
            ))}
            <p className="admin-group-hint">El tipo y el código no se pueden cambiar después de crearla.</p>
          </fieldset>
          <PromotionFields form={form} errors={errors} disabled={save.saving} onChange={setForm} />
          <p className="admin-create-note">Se crea desactivada: activala cuando esté lista para la carta.</p>
          <div className="flex flex-wrap gap-2">
            <button type="submit" className="admin-button admin-primary" disabled={save.saving}>
              Crear promoción
            </button>
            <button type="button" className="admin-button" disabled={save.saving || !dirty} onClick={reset}>
              Descartar
            </button>
          </div>
          {save.view}
        </form>
      ) : null}
    </Sheet>
  )
}
