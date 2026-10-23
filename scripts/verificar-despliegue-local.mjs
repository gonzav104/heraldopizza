// Runs supabase/verificar_despliegue.sql (read-only) on the LOCAL stack's database and fails on any FALLA or DIFERENTE
// (P6b-2). It reaches the database through its local container, so it cannot touch a remote project; for a real
// deployment the same file is run by whoever is authorized, with psql or in the SQL editor (docs/despliegue.md).
// Run on the freshly seeded stack, every row must be «ok» (the administrator row may be an AVISO).
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { parseSqlOutput, summarize } from './resumen-verificacion.mjs'

const project = /^project_id\s*=\s*"([^"]+)"/m.exec(readFileSync('supabase/config.toml', 'utf8'))?.[1]
if (!project) {
  console.error('supabase/config.toml has no project_id.')
  process.exit(1)
}
let output
try {
  output = execFileSync(
    'docker',
    ['exec', '-i', `supabase_db_${project}`, 'psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-X', '-A', '-t', '-F', ' | '],
    { input: readFileSync('supabase/verificar_despliegue.sql'), encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] },
  )
} catch (error) {
  console.error(`The verification could not run on the local stack (is it started? npm run db:start):\n${error instanceof Error ? error.message : error}`)
  process.exit(1)
}
const rows = parseSqlOutput(output)
for (const row of rows) console.log(`${row.resultado.padEnd(9)} ${row.comprobacion}`)
const { failed, counts, blocking } = summarize(rows, { permitirDiferentes: process.argv.includes('--permitir-diferentes') })
console.log(`\n${counts.ok} ok, ${counts.FALLA} FALLA, ${counts.DIFERENTE} DIFERENTE, ${counts.AVISO} AVISO.`)
if (failed) {
  console.error('Deployment verification failed:\n- ' + (blocking.map((row) => `${row.resultado}: ${row.comprobacion} (esperado ${row.esperado}; obtenido ${row.obtenido})`).join('\n- ') || 'no result rows'))
  process.exit(1)
}
console.log('Deployment verification passed.')
