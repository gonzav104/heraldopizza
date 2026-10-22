/**
 * What a failed save means to the admin panel, shared by the catalog and the promotions (P5b). «conflict» covers a row
 * that changed since it was read (or that this account may not write: the database cannot tell the two apart without
 * revealing more), so the panel asks to reload.
 */
export type SaveFailure = 'validation' | 'conflict' | 'not-found' | 'forbidden' | 'unavailable'

export class AdminSaveError extends Error {
  override name = 'AdminSaveError'
  readonly reason: SaveFailure

  constructor(reason: SaveFailure, message: string, options?: ErrorOptions) {
    super(message, options)
    this.reason = reason
  }
}

/** The database error codes the panel tells apart (the RPCs' HP codes and the table constraints and privileges). */
const failureByCode: Record<string, SaveFailure> = {
  HP422: 'validation',
  '23514': 'validation',
  '23502': 'validation',
  HP404: 'not-found',
  HP409: 'conflict',
  HP403: 'forbidden',
  '42501': 'forbidden',
}

/** Turns a Supabase error into the failure the panel shows; unknown codes mean the save could not be completed. */
export function saveError(error: unknown): AdminSaveError {
  const code = (error as { code?: unknown } | null)?.code
  const reason = typeof code === 'string' ? (failureByCode[code] ?? 'unavailable') : 'unavailable'
  return new AdminSaveError(reason, `Save failed (${typeof code === 'string' ? code : 'no code'})`, { cause: error })
}

export function failureReason(error: unknown): SaveFailure {
  return error instanceof AdminSaveError ? error.reason : 'unavailable'
}

export interface ReloadScope {
  /** What a reload brings back, as in «Recargá el catálogo». */
  target: string
  /** The reload button, as in «Recargar catálogo». */
  action: string
}

export const CATALOG_SCOPE: ReloadScope = { target: 'el catálogo', action: 'Recargar catálogo' }

/** Whole pesos with dots as thousands separators: 42000 → «42.000». */
export const formatPrice = (price: number) => String(price).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
