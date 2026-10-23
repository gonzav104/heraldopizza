// Shared by the deployment checks (P6b-2): the SQL verification and the public API verification report rows with the
// same four results. FALLA (structure, permissions, RLS) always blocks; DIFERENTE (data other than the authorized
// initial data) blocks unless the data was edited on purpose; AVISO and ok never block.

/** Rows of `psql -A -t -F ' | '` output: «comprobación | esperado | obtenido | resultado». */
export function parseSqlOutput(output) {
  return output
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.includes(' | '))
    .map((line) => {
      const parts = line.split(' | ')
      return { comprobacion: parts[0], esperado: parts[1] ?? '', obtenido: parts.slice(2, -1).join(' | '), resultado: parts[parts.length - 1] }
    })
}

/**
 * @param {{ comprobacion: string, resultado: string }[]} rows
 * @param {{ permitirDiferentes?: boolean }} options
 */
export function summarize(rows, { permitirDiferentes = false } = {}) {
  const counts = { ok: 0, FALLA: 0, DIFERENTE: 0, AVISO: 0 }
  for (const row of rows) counts[row.resultado] = (counts[row.resultado] ?? 0) + 1
  const unknown = rows.filter((row) => !(row.resultado in counts) || !['ok', 'FALLA', 'DIFERENTE', 'AVISO'].includes(row.resultado))
  const blocking = rows.filter((row) => row.resultado === 'FALLA' || (row.resultado === 'DIFERENTE' && !permitirDiferentes))
  // No rows at all means the query never ran (an error, a wrong database): never a pass.
  const failed = rows.length === 0 || blocking.length > 0 || unknown.length > 0
  return { failed, counts, blocking: [...blocking, ...unknown] }
}
