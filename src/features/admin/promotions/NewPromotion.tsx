import { useEffect, useId, useState, type FormEvent } from 'react'
import { Sheet } from '@/components/ui/Sheet'
import type { AdminPromotion, AdminPromotionsRepository, NewPromotion as Kind } from '@/features/admin/promotions/admin-promotions'
import { PromotionFields } from '@/features/admin/promotions/PromotionFields'
import { emptyPromotionForm, validatePromotionForm, type PromotionErrors } from '@/features/admin/promotions/promotion-edits'
import { failureReason, type SaveFailure } from '@/features/admin/shared/admin-save'

const KINDS: { kind: Kind['kind']; label: string; hint: string }[] = [
  { kind: 'closed', label: 'Combo cerrado', hint: 'Productos fijos, descriptos en el título y la descripción.' },
  {
    kind: 'dozen',
    label: 'Docena de empanadas a elección (12)',
    hint: 'El cliente elige los gustos de 12 empanadas en la carta.',
  },
]

/**
 * How the last create ended. A definite refusal (the database answered no) only asks to fix the data. A lost answer
 * («unavailable»: dropped connection, timeout, an unreadable response) is uncertain: the insert may have gone through,
 * and the code is generated, so nothing in the database would stop a second one. The sheet then never sends it again
 * on its own: it asks to refresh the list first, and creating again stays the owner's explicit decision.
 */
type Outcome =
  | { kind: 'idle' }
  | { kind: 'saving' }
  | { kind: 'refused'; reason: SaveFailure }
  | { kind: 'uncertain'; refreshFailed: boolean }
  | { kind: 'refreshing' }
  | { kind: 'refreshed'; added: number }

const UNCERTAIN = 'No pudimos confirmar si se creó la promoción. Actualizá la lista antes de volver a intentarlo.'

const REFUSED: Partial<Record<SaveFailure, string>> = {
  validation: 'La base no aceptó el cambio. Revisá los datos.',
  forbidden: 'Tu cuenta no puede guardar cambios.',
}

const refreshedText = (added: number) =>
  added === 0
    ? 'La lista se actualizó y no apareció ninguna promoción nueva. Podés volver a intentarlo.'
    : `La lista se actualizó: ${added === 1 ? 'apareció 1 promoción nueva' : `aparecieron ${added} promociones nuevas`}. ` +
      'Revisá si es la que intentabas crear antes de volver a intentarlo.'

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
  onRefresh,
  onWorkChange,
}: {
  open: boolean
  onClose: () => void
  nextOrder: number
  repository: AdminPromotionsRepository
  onCreated: (created: AdminPromotion) => void
  /** Reads the list again and adds the promotions it did not have; resolves with how many it added. */
  onRefresh: () => Promise<number>
  onWorkChange: (work: { dirty: boolean; saving: boolean }) => void
}) {
  const titleId = useId()
  const kindName = useId()
  const [kind, setKind] = useState<Kind['kind']>('closed')
  const [form, setForm] = useState(emptyPromotionForm)
  const [errors, setErrors] = useState<PromotionErrors>({})
  const [outcome, setOutcome] = useState<Outcome>({ kind: 'idle' })
  const busy = outcome.kind === 'saving' || outcome.kind === 'refreshing'
  // While the last create is unconfirmed, creating again waits for a refreshed list.
  const locked = outcome.kind === 'uncertain' || outcome.kind === 'refreshing'
  const dirty = kind !== 'closed' || JSON.stringify(form) !== JSON.stringify(emptyPromotionForm)
  useEffect(() => onWorkChange({ dirty, saving: busy }), [dirty, busy, onWorkChange])

  /** Clears the form. An unconfirmed create stays unconfirmed: only a refreshed list unlocks creating again. */
  const reset = () => {
    setKind('closed')
    setForm(emptyPromotionForm)
    setErrors({})
    setOutcome((current) => (current.kind === 'uncertain' ? current : { kind: 'idle' }))
  }

  const refresh = async () => {
    setOutcome({ kind: 'refreshing' })
    try {
      setOutcome({ kind: 'refreshed', added: await onRefresh() })
    } catch {
      setOutcome({ kind: 'uncertain', refreshFailed: true })
    }
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    // The disabled button already prevents this; a submit by other means must not send a second insert either.
    if (busy || locked) return
    const result = validatePromotionForm(form)
    if (!result.ok) {
      setErrors(result.errors)
      return
    }
    setErrors({})
    setOutcome({ kind: 'saving' })
    repository.create({ kind, ...result.values }, nextOrder).then(
      (created) => {
        onCreated(created)
        reset()
        setOutcome({ kind: 'idle' })
        onClose()
      },
      (error: unknown) => {
        const reason = failureReason(error)
        setOutcome(reason === 'unavailable' ? { kind: 'uncertain', refreshFailed: false } : { kind: 'refused', reason })
      },
    )
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
          <fieldset className="admin-group" disabled={busy}>
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
          <PromotionFields form={form} errors={errors} disabled={busy} onChange={setForm} />
          <p className="admin-create-note">Se crea desactivada: activala cuando esté lista para la carta.</p>
          <div className="flex flex-wrap gap-2">
            <button type="submit" className="admin-button admin-primary" disabled={busy || locked}>
              Crear promoción
            </button>
            <button type="button" className="admin-button" disabled={busy || !dirty} onClick={reset}>
              Descartar
            </button>
          </div>
          <CreateOutcome outcome={outcome} onRefresh={() => void refresh()} />
        </form>
      ) : null}
    </Sheet>
  )
}

function CreateOutcome({ outcome, onRefresh }: { outcome: Outcome; onRefresh: () => void }) {
  switch (outcome.kind) {
    case 'idle':
      return null
    case 'saving':
    case 'refreshing':
      return (
        <p role="status" className="admin-create-feedback">
          {outcome.kind === 'saving' ? 'Creando…' : 'Actualizando la lista…'}
        </p>
      )
    case 'refused':
      return (
        <p role="alert" className="admin-create-feedback admin-create-problem">
          {REFUSED[outcome.reason] ?? 'No pudimos crear la promoción. Revisá los datos e intentá de nuevo.'}
        </p>
      )
    case 'uncertain':
      return (
        <div className="admin-create-uncertain">
          <p role="alert" className="admin-create-feedback admin-create-problem">
            {outcome.refreshFailed ? 'No pudimos actualizar la lista. Probá de nuevo en un momento. ' : ''}
            {UNCERTAIN}
          </p>
          <button type="button" className="admin-button" onClick={onRefresh}>
            Actualizar la lista
          </button>
        </div>
      )
    case 'refreshed':
      return (
        <p role="status" className="admin-create-feedback">
          {refreshedText(outcome.added)}
        </p>
      )
  }
}
