import type { Ars } from '@/domain/catalog'
import type { ProductChanges } from '@/features/admin/catalog/admin-catalog'

/**
 * Pure checks for what the owner types in the panel (U5). They mirror the database rules, so most mistakes are caught
 * before a request is sent; the database still enforces every rule.
 */

const MAX_PRICE = 2147483647
const PRICE_ERROR = 'Ingresá un precio entero mayor a 0.'
const NAME_ERROR = 'El nombre no puede quedar vacío.'
const NOTICE_ERROR = 'Escribí el aviso de anticipación.'

/**
 * Whole Argentine pesos (RN-02): «16000», «16.000», «$ 16.000». Decimals, 0, negatives, and text are rejected; an empty
 * field is an error too, because «Consultar en barra» (null) is only chosen explicitly.
 */
export function parsePrice(input: string): { ok: true; price: Ars } | { ok: false; error: string } {
  const text = input.trim().replace(/^\$\s*/, '')
  if (!/^\d+$/.test(text) && !/^\d{1,3}(\.\d{3})+$/.test(text)) return { ok: false, error: PRICE_ERROR }
  const price = Number(text.replaceAll('.', ''))
  if (!Number.isSafeInteger(price) || price < 1 || price > MAX_PRICE) return { ok: false, error: PRICE_ERROR }
  return { ok: true, price }
}

/** Names cannot be empty or only spaces; they are saved trimmed. */
export function validateName(input: string): { ok: true; value: string } | { ok: false; error: string } {
  const value = input.trim()
  return value ? { ok: true, value } : { ok: false, error: NAME_ERROR }
}

/** Description and notice: blank means none (null), as the public menu already reads them. */
export function normalizeOptionalText(input: string | null): string | null {
  const value = input?.trim() ?? ''
  return value === '' ? null : value
}

export interface ProductForm {
  name: string
  description: string
  madeToOrder: boolean
  madeToOrderNotice: string
}

type ProductEditErrors = Partial<Record<'name' | 'madeToOrderNotice', string>>

/** Validates the product data form and returns only the editable fields, normalized. */
export function validateProductEdit(
  form: ProductForm,
): { ok: true; changes: Required<Pick<ProductChanges, 'name' | 'description' | 'madeToOrder' | 'madeToOrderNotice'>> } | { ok: false; errors: ProductEditErrors } {
  const errors: ProductEditErrors = {}
  const name = validateName(form.name)
  if (!name.ok) errors.name = name.error
  const notice = normalizeOptionalText(form.madeToOrderNotice)
  if (form.madeToOrder && notice === null) errors.madeToOrderNotice = NOTICE_ERROR
  if (!name.ok || errors.madeToOrderNotice) return { ok: false, errors }
  return {
    ok: true,
    changes: {
      name: name.value,
      description: normalizeOptionalText(form.description),
      madeToOrder: form.madeToOrder,
      madeToOrderNotice: notice,
    },
  }
}
