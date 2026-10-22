import type { SupabaseClient } from '@supabase/supabase-js'
import { AdminSaveError, saveError } from '@/features/admin/shared/admin-save'

export type Row = Record<string, unknown>

/**
 * The optimistic lock shared by the admin adapters (U5, P5b): updates one row, only with the given columns, where its
 * `actualizado_en` still equals the token the panel read, and returns the row as saved. Zero rows updated is a conflict,
 * never a success: the row changed since it was read, or this account may not write it.
 */
export async function updateGuardedRow(
  client: SupabaseClient,
  table: string,
  columns: string,
  id: string,
  payload: Row,
  updatedAt: string,
): Promise<Row> {
  const { data, error } = await client.from(table).update(payload).eq('id', id).eq('actualizado_en', updatedAt).select(columns)
  if (error) throw saveError(error)
  if (!Array.isArray(data)) throw new AdminSaveError('unavailable', 'Unexpected data: updated rows')
  if (data.length !== 1) throw new AdminSaveError('conflict', 'The row changed since it was read, or it cannot be written')
  return data[0] as unknown as Row
}
