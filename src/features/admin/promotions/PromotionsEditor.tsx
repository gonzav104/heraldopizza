import { useCallback, useEffect, useId, useState, type FormEvent } from 'react'
import { Sheet } from '@/components/ui/Sheet'
import '@/features/admin/catalog/catalog-workspace.css'
import './promotions.css'
import type { AdminPromotion, AdminPromotionsRepository } from '@/features/admin/promotions/admin-promotions'
import { PromotionFields } from '@/features/admin/promotions/PromotionFields'
import {
  argentinaToday,
  promotionForm,
  promotionStatus,
  validatePromotionForm,
  type PromotionErrors,
  type PromotionForm,
  type Today,
} from '@/features/admin/promotions/promotion-edits'
import {
  PROMOTIONS_SCOPE,
  STATUS_HINT,
  STATUS_LABEL,
  compositionText,
  validityText,
} from '@/features/admin/promotions/promotion-labels'
import { formatPrice } from '@/features/admin/shared/admin-save'
import { Toggle } from '@/features/admin/shared/SaveFeedback'
import { useSave } from '@/features/admin/shared/use-save'

/**
 * Promotions section of the admin panel (P5b): every promotion, active or not, with the state the public menu gives
 * it today in Argentina, its visibility switch, and an edit sheet for its commercial fields. The code and the
 * composition are shown, never edited. Every save shows the row the database returned; the public menu reads the
 * promotions when it loads, and row level security decides there what it shows.
 */

type Work = { dirty: boolean; saving: boolean }
type ReportWork = (id: string, work: Work) => void
type LoadState = { kind: 'loading' } | { kind: 'failed' } | { kind: 'ready'; promotions: AdminPromotion[] }

/** Two forms say the same when they would save the same; the order the days were ticked does not count. */
const sameForm = (a: PromotionForm, b: PromotionForm) =>
  JSON.stringify({ ...a, days: [...a.days].sort() }) === JSON.stringify({ ...b, days: [...b.days].sort() })

const STATUS_CLASS: Record<string, string> = { active: 'admin-active', 'off-day': 'admin-pending', scheduled: 'admin-info' }

function PromotionCard({
  promotion,
  today,
  repository,
  onSaved,
  onReload,
  report,
}: {
  promotion: AdminPromotion
  today: Today
  repository: AdminPromotionsRepository
  onSaved: (saved: AdminPromotion) => void
  onReload: () => void
  report: ReportWork
}) {
  const headingId = useId()
  const detailId = useId()
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState(() => promotionForm(promotion))
  const [errors, setErrors] = useState<PromotionErrors>({})
  const stateSave = useSave(onReload, 'Estado', PROMOTIONS_SCOPE)
  const dataSave = useSave(onReload, 'Datos', PROMOTIONS_SCOPE)
  // Saves run one at a time per promotion, so each request carries the last token the database returned.
  const saving = stateSave.saving || dataSave.saving
  const dirty = !sameForm(form, promotionForm(promotion))
  useEffect(() => {
    report(promotion.id, { dirty, saving })
  }, [promotion.id, dirty, saving, report])

  const status = promotionStatus(promotion, today)
  const hint = STATUS_HINT[status]

  const setVisible = async (visible: boolean) => {
    const confirmed =
      visible ||
      window.confirm(
        `¿Desactivar «${promotion.title}»? Deja de mostrarse en la carta, y los pedidos guardados que la tengan la verán como no disponible.`,
      )
    if (!confirmed) return
    await stateSave.run(async () => onSaved(await repository.update(promotion.id, { visible }, promotion.updatedAt)))
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const result = validatePromotionForm(form)
    if (!result.ok) {
      setErrors(result.errors)
      return
    }
    setErrors({})
    void dataSave.run(async () => {
      const saved = await repository.update(promotion.id, result.values, promotion.updatedAt)
      onSaved(saved)
      setForm(promotionForm(saved))
      setEditing(false)
    })
  }

  return (
    <section aria-labelledby={headingId} className="admin-product-card admin-promotion-card">
      <div className="admin-product-heading">
        <div className="min-w-0">
          <h2 id={headingId}>{promotion.title}</h2>
          <p className="admin-promotion-code">{promotion.code}</p>
        </div>
        <button
          type="button"
          className="admin-button"
          aria-label={`Editar ${promotion.title}`}
          onClick={() => setEditing(true)}
        >
          Editar
        </button>
      </div>
      <div className="admin-badges">
        <span className={STATUS_CLASS[status]}>{STATUS_LABEL[status]}</span>
        {dirty ? <span className="admin-pending">Cambios sin guardar</span> : null}
      </div>
      <p className="admin-promotion-price">$ {formatPrice(promotion.price)}</p>
      <div className="admin-promotion-facts">
        <p>{compositionText(promotion)}</p>
        <p>{validityText(promotion)}</p>
        {hint ? <p className="admin-promotion-hint">{hint}</p> : null}
      </div>
      <div className="admin-quick-state">
        <Toggle
          label={`Visible en la carta: ${promotion.title}`}
          checked={promotion.visible}
          disabled={saving}
          onChange={setVisible}
        />
      </div>
      {stateSave.view}
      {!editing ? dataSave.view : null}
      <Sheet
        open={editing}
        onClose={() => setEditing(false)}
        labelledBy={detailId}
        dismissOnBackdrop={false}
        header={
          <div>
            <h2 id={detailId}>{promotion.title}</h2>
          </div>
        }
      >
        {editing ? (
          <form className="admin-data-form" noValidate onSubmit={submit}>
            <div className="admin-fixed-facts">
              <p>{compositionText(promotion)}</p>
              <p className="admin-promotion-code">{promotion.code}</p>
              <p className="admin-group-hint">La composición y el código no se pueden cambiar.</p>
            </div>
            <PromotionFields form={form} errors={errors} disabled={saving} onChange={setForm} />
            <div className="flex flex-wrap gap-2">
              <button type="submit" className="admin-button admin-primary" disabled={saving}>
                Guardar cambios
              </button>
              <button
                type="button"
                className="admin-button"
                disabled={saving || !dirty}
                onClick={() => {
                  setForm(promotionForm(promotion))
                  setErrors({})
                  dataSave.clear()
                }}
              >
                Descartar cambios
              </button>
            </div>
            {dataSave.view}
          </form>
        ) : null}
      </Sheet>
    </section>
  )
}

export function PromotionsEditor({
  repository,
  onWorkChange,
}: {
  repository: AdminPromotionsRepository
  onWorkChange?: (work: Work) => void
}) {
  const [state, setState] = useState<LoadState>({ kind: 'loading' })
  const [attempt, setAttempt] = useState(0)
  const [work, setWork] = useState<Record<string, Work>>({})
  const dirty = Object.values(work).some((value) => value.dirty)
  const saving = Object.values(work).some((value) => value.saving)
  const report = useCallback<ReportWork>(
    (id, next) =>
      setWork((current) =>
        current[id]?.dirty === next.dirty && current[id]?.saving === next.saving ? current : { ...current, [id]: next },
      ),
    [],
  )
  useEffect(() => {
    onWorkChange?.({ dirty, saving })
  }, [dirty, saving, onWorkChange])
  useEffect(() => () => onWorkChange?.({ dirty: false, saving: false }), [onWorkChange])
  useEffect(() => {
    if (!dirty && !saving) return
    const guard = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', guard)
    return () => window.removeEventListener('beforeunload', guard)
  }, [dirty, saving])

  useEffect(() => {
    let active = true
    repository.load().then(
      (promotions) => {
        if (active) setState({ kind: 'ready', promotions })
      },
      (error: unknown) => {
        if (!active) return
        console.error('The promotions could not be loaded', error)
        setState({ kind: 'failed' })
      },
    )
    return () => {
      active = false
    }
  }, [repository, attempt])

  const reload = useCallback(() => {
    if (saving || (dirty && !window.confirm('Hay cambios sin guardar. ¿Descartarlos y recargar las promociones?'))) return
    setWork({})
    setState({ kind: 'loading' })
    setAttempt((value) => value + 1)
  }, [dirty, saving])

  const patch = (saved: AdminPromotion) =>
    setState((current) =>
      current.kind === 'ready'
        ? { ...current, promotions: current.promotions.map((item) => (item.id === saved.id ? saved : item)) }
        : current,
    )

  if (state.kind === 'loading') {
    return (
      <p role="status" className="font-semibold">
        Cargando promociones…
      </p>
    )
  }
  if (state.kind === 'failed') {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <p role="alert" className="font-semibold text-mostaza">
          No pudimos cargar las promociones.
        </p>
        <button type="button" className="admin-button" onClick={reload}>
          Reintentar
        </button>
      </div>
    )
  }

  const today = argentinaToday(new Date())
  const { promotions } = state
  const active = promotions.filter((item) => promotionStatus(item, today) === 'active').length
  return (
    <div className="admin-catalog admin-promotions">
      <div className="admin-workspace-intro">
        <div>
          <h1>Promociones</h1>
          <p>Activá, editá y ordená los combos de la carta. Los cambios se ven al recargar la carta.</p>
        </div>
        <button type="button" className="admin-button" disabled={saving} onClick={reload}>
          Recargar promociones
        </button>
      </div>
      {dirty ? <p className="admin-work-summary">Tenés cambios pendientes en promociones.</p> : null}
      {promotions.length === 0 ? (
        <div className="admin-empty">
          <h2>Todavía no hay promociones</h2>
          <p>Cuando cargues una, va a aparecer acá.</p>
        </div>
      ) : (
        <>
          <p className="admin-result-count">
            {promotions.length} {promotions.length === 1 ? 'promoción' : 'promociones'} · {active}{' '}
            {active === 1 ? 'activa' : 'activas'}
          </p>
          <div className="admin-promotion-list">
            {promotions.map((promotion) => (
              <PromotionCard
                key={promotion.id}
                promotion={promotion}
                today={today}
                repository={repository}
                onSaved={patch}
                onReload={reload}
                report={report}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
