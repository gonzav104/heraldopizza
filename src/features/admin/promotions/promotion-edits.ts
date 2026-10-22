import type { Ars } from '@/domain/catalog'
import { normalizeOptionalText, parsePrice } from '@/features/admin/catalog/catalog-edits'
import type { AdminPromotion } from '@/features/admin/promotions/admin-promotions'
import { formatPrice } from '@/features/admin/shared/admin-save'
import type { Today } from '@/lib/argentina-time'

/**
 * Pure checks and states of the promotions editor (P5b). They mirror the database rules, so most mistakes are caught
 * before a request is sent; the database still enforces every rule and decides what the public menu shows.
 */

export interface PromotionForm {
  title: string
  description: string
  price: string
  /** YYYY-MM-DD, as a date input gives it; empty means no limit. */
  from: string
  to: string
  everyDay: boolean
  days: number[]
}

export const emptyPromotionForm: PromotionForm = {
  title: '',
  description: '',
  price: '',
  from: '',
  to: '',
  everyDay: true,
  days: [],
}

export interface PromotionValues {
  title: string
  description: string | null
  price: Ars
  activeFrom: string | null
  activeTo: string | null
  weekdays: number[] | null
}

export type PromotionErrors = Partial<Record<'title' | 'price' | 'from' | 'to' | 'days', string>>

const DATE_ERROR = 'Ingresá una fecha válida.'

/** A real calendar date in YYYY-MM-DD, or null when it is empty; undefined when it is not a valid date. */
function parseDate(input: string): string | null | undefined {
  const text = input.trim()
  if (text === '') return null
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text)
  if (!match) return undefined
  const [year, month, day] = match.slice(1).map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day ? text : undefined
}

export function validatePromotionForm(
  form: PromotionForm,
): { ok: true; values: PromotionValues } | { ok: false; errors: PromotionErrors } {
  const errors: PromotionErrors = {}
  const title = form.title.trim()
  if (!title) errors.title = 'El título no puede quedar vacío.'
  const price = parsePrice(form.price)
  if (!price.ok) errors.price = price.error
  const from = parseDate(form.from)
  if (from === undefined) errors.from = DATE_ERROR
  const to = parseDate(form.to)
  if (to === undefined) errors.to = DATE_ERROR
  else if (from && to && to < from) errors.to = 'La fecha de fin no puede ser anterior a la de inicio.'
  const days = [...new Set(form.days)].filter((day) => Number.isInteger(day) && day >= 0 && day <= 6).sort((a, b) => a - b)
  if (!form.everyDay && days.length === 0) errors.days = 'Elegí al menos un día.'
  if (Object.keys(errors).length > 0 || !price.ok) return { ok: false, errors }
  return {
    ok: true,
    values: {
      title,
      description: normalizeOptionalText(form.description),
      price: price.price,
      activeFrom: from ?? null,
      activeTo: to ?? null,
      weekdays: form.everyDay ? null : days,
    },
  }
}

/** The form that edits a saved promotion. */
export function promotionForm(promotion: AdminPromotion): PromotionForm {
  return {
    title: promotion.title,
    description: promotion.description ?? '',
    price: formatPrice(promotion.price),
    from: promotion.activeFrom ?? '',
    to: promotion.activeTo ?? '',
    everyDay: promotion.weekdays === null,
    days: promotion.weekdays ?? [],
  }
}

export { argentinaToday, type Today } from '@/lib/argentina-time'

export type PromotionStatus = 'active' | 'disabled' | 'scheduled' | 'expired' | 'off-day' | 'hidden-category'

/**
 * What the public menu would do with the promotion today, for the panel to tell. Informative only: the public read
 * policy decides with the database clock, and a computer with a wrong clock can only mislabel, never publish.
 */
export function promotionStatus(promotion: AdminPromotion, today: Today): PromotionStatus {
  if (!promotion.visible) return 'disabled'
  if (promotion.activeTo && promotion.activeTo < today.date) return 'expired'
  if (promotion.activeFrom && promotion.activeFrom > today.date) return 'scheduled'
  if (promotion.flavorChoice && !promotion.flavorChoice.categoryVisible) return 'hidden-category'
  if (promotion.weekdays && !promotion.weekdays.includes(today.weekday)) return 'off-day'
  return 'active'
}
