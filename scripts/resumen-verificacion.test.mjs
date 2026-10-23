import { describe, expect, it } from 'vitest'
import { parseSqlOutput, summarize } from './resumen-verificacion.mjs'

const output = [
  'migraciones aplicadas | 1,2 | 1,2 | ok',
  'huella de los productos | abc | def | DIFERENTE',
  'administradores | 1 o más | 0: nadie | AVISO',
  '',
].join('\n')

describe('parseSqlOutput', () => {
  it('reads each row: check, expected, obtained, and the result at the end', () => {
    expect(parseSqlOutput(output)).toEqual([
      { comprobacion: 'migraciones aplicadas', esperado: '1,2', obtenido: '1,2', resultado: 'ok' },
      { comprobacion: 'huella de los productos', esperado: 'abc', obtenido: 'def', resultado: 'DIFERENTE' },
      { comprobacion: 'administradores', esperado: '1 o más', obtenido: '0: nadie', resultado: 'AVISO' },
    ])
  })

  it('ignores psql noise that is not a result row', () => {
    expect(parseSqlOutput('ERROR:  relation does not exist\nLINE 1: select\n')).toEqual([])
  })
})

describe('summarize', () => {
  const rows = parseSqlOutput(output)

  it('blocks on a different data set unless it was edited on purpose', () => {
    expect(summarize(rows).failed).toBe(true)
    expect(summarize(rows, { permitirDiferentes: true }).failed).toBe(false)
  })

  it('always blocks on FALLA, even when different data is allowed', () => {
    const broken = [...rows, { comprobacion: 'RLS', esperado: 'a', obtenido: 'b', resultado: 'FALLA' }]
    expect(summarize(broken, { permitirDiferentes: true })).toMatchObject({ failed: true, blocking: [{ comprobacion: 'RLS' }] })
  })

  it('never passes when nothing ran or a result is unknown', () => {
    expect(summarize([]).failed).toBe(true)
    expect(summarize([{ comprobacion: 'x', esperado: '', obtenido: '', resultado: 'quizás' }]).failed).toBe(true)
  })

  it('counts every result', () => {
    expect(summarize(rows).counts).toEqual({ ok: 1, FALLA: 0, DIFERENTE: 1, AVISO: 1 })
  })
})
