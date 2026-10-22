import { useId, useState, type ReactNode } from 'react'
import type { ReloadScope, SaveFailure } from '@/features/admin/shared/admin-save'

/**
 * Save feedback shared by the sections of the admin panel (P5b): every save shows «Guardando…», «Guardado», or why it
 * failed, with the way out that fits («Recargar …» after a conflict, «Reintentar» when offline). Each section names
 * what a reload brings back, so the messages read «Recargá el catálogo» or «Recargá las promociones».
 */

const failureMessage = (reason: SaveFailure, scope: ReloadScope): string =>
  ({
    validation: 'La base no aceptó el cambio. Revisá los datos.',
    conflict: `Otro cambio llegó antes. Recargá ${scope.target} para ver lo último.`,
    'not-found': `Ese dato ya no existe. Recargá ${scope.target}.`,
    forbidden: 'Tu cuenta no puede guardar cambios.',
    unavailable: 'No pudimos guardar. Revisá tu conexión e intentá de nuevo.',
  })[reason]

export type Feedback =
  { kind: 'idle' } | { kind: 'saving' } | { kind: 'saved' } | { kind: 'failed'; reason: SaveFailure; retry: () => void }

export function SaveFeedback({
  feedback,
  onReload,
  label,
  scope,
}: {
  feedback: Feedback
  onReload: () => void
  label: string
  scope: ReloadScope
}) {
  if (feedback.kind === 'idle') return null
  if (feedback.kind === 'saving' || feedback.kind === 'saved') {
    return (
      <p role="status" className="text-[0.9375rem] font-semibold text-crema-muted">
        {label ? `${label}: ` : ''}
        {feedback.kind === 'saving' ? 'Guardando…' : 'Guardado'}
      </p>
    )
  }
  const reload = feedback.reason === 'conflict' || feedback.reason === 'not-found'
  return (
    <div className="flex flex-wrap items-center gap-3">
      <p role="alert" className="text-[0.9375rem] font-semibold text-mostaza">
        {failureMessage(feedback.reason, scope)}
      </p>
      {reload ? (
        <button type="button" onClick={onReload} className="admin-button">
          {scope.action}
        </button>
      ) : feedback.reason === 'unavailable' ? (
        <button type="button" onClick={feedback.retry} className="admin-button">
          Reintentar
        </button>
      ) : null}
    </div>
  )
}

/**
 * A checkbox that saves on change. While the save runs it shows the requested state, so the tap visibly registers;
 * when the save ends it shows the saved row again (the new state, or the old one if the save failed).
 */
export function Toggle({
  label,
  checked,
  disabled,
  onChange,
  description,
}: {
  label: string
  checked: boolean
  disabled: boolean
  onChange: (checked: boolean) => Promise<unknown>
  description?: ReactNode
}) {
  const descriptionId = useId()
  const [pending, setPending] = useState<boolean | null>(null)
  const change = async (next: boolean) => {
    setPending(next)
    try {
      await onChange(next)
    } finally {
      setPending(null)
    }
  }
  return (
    <div className="flex flex-col gap-1">
      <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 font-semibold">
        <input
          type="checkbox"
          aria-label={label}
          aria-describedby={description ? descriptionId : undefined}
          checked={pending ?? checked}
          disabled={disabled}
          onChange={(event) => void change(event.target.checked)}
          className="size-5 accent-[var(--color-heraldo)]"
        />
        <span aria-hidden="true">{label.split(':')[0]}</span>
      </label>
      {description ? (
        <p id={descriptionId} className="text-[0.875rem] text-crema-muted">
          {description}
        </p>
      ) : null}
    </div>
  )
}

export function Unsaved({ children }: { children: ReactNode }) {
  return <p className="text-[0.875rem] font-semibold text-mostaza">{children}</p>
}
