import type { AdminPromotion } from '@/features/admin/promotions/admin-promotions'
import type { PromotionStatus } from '@/features/admin/promotions/promotion-edits'
import type { ReloadScope } from '@/features/admin/shared/admin-save'

/** The words the promotions editor shows (P5b), kept apart from the components so tests and views share them. */

export const PROMOTIONS_SCOPE: ReloadScope = { target: 'las promociones', action: 'Recargar promociones' }

export const STATUS_LABEL: Record<PromotionStatus, string> = {
  active: 'Activa',
  disabled: 'Desactivada',
  scheduled: 'Programada',
  expired: 'Vencida',
  'off-day': 'Fuera de día',
  'hidden-category': 'Categoría de gustos oculta',
}

/** Why the public menu does not show it today, for every state but «Activa». */
export const STATUS_HINT: Record<PromotionStatus, string | null> = {
  active: null,
  disabled: 'No se muestra en la carta.',
  scheduled: 'Todavía no empezó su vigencia.',
  expired: 'Ya terminó su vigencia.',
  'off-day': 'Hoy no es uno de sus días.',
  'hidden-category': 'No se muestra porque la categoría Empanadas está oculta.',
}

/** Monday first, as the owner reads a week; the values are PostgreSQL's (0 = Sunday). */
export const WEEK: { day: number; name: string; short: string }[] = [
  { day: 1, name: 'Lunes', short: 'Lun' },
  { day: 2, name: 'Martes', short: 'Mar' },
  { day: 3, name: 'Miércoles', short: 'Mié' },
  { day: 4, name: 'Jueves', short: 'Jue' },
  { day: 5, name: 'Viernes', short: 'Vie' },
  { day: 6, name: 'Sábado', short: 'Sáb' },
  { day: 0, name: 'Domingo', short: 'Dom' },
]

/** 2026-11-01 → «01/11/2026», straight from the text, with no Date and no time zone involved. */
export const formatDate = (iso: string) => iso.split('-').reverse().join('/')

export function validityText(promotion: Pick<AdminPromotion, 'activeFrom' | 'activeTo' | 'weekdays'>): string {
  const { activeFrom: from, activeTo: to, weekdays } = promotion
  const dates = from && to
    ? from === to
      ? `Solo el ${formatDate(from)}`
      : `Del ${formatDate(from)} al ${formatDate(to)}`
    : from
      ? `Desde el ${formatDate(from)}`
      : to
        ? `Hasta el ${formatDate(to)}`
        : 'Sin límite de fechas'
  const days = weekdays
    ? WEEK.filter(({ day }) => weekdays.includes(day))
        .map(({ name }) => name)
        .join(', ')
    : 'Todos los días'
  return `${dates} · ${days}`
}

export function compositionText(promotion: Pick<AdminPromotion, 'flavorChoice'>): string {
  return promotion.flavorChoice ? `Docena a elección: ${promotion.flavorChoice.units} empanadas` : 'Combo cerrado'
}
