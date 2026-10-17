import { execFileSync } from 'node:child_process'

/**
 * URL and publishable key of the LOCAL Supabase stack, read from `supabase status`. Throws for any non-local API, so
 * the E2E run (config, setup, and tests) can never reach a remote project.
 */
export function localStackEnv(): { VITE_SUPABASE_URL: string; VITE_SUPABASE_PUBLISHABLE_KEY: string } {
  const status = execFileSync('npx', ['supabase', 'status', '-o', 'env'], { encoding: 'utf8' })
  const env = Object.fromEntries([...status.matchAll(/^([A-Z_]+)="?([^"\n]*)"?$/gm)].map((match) => [match[1], match[2]]))
  const host = env.API_URL ? new URL(env.API_URL).hostname : ''
  if (host !== '127.0.0.1' && host !== 'localhost') {
    throw new Error(`E2E tests run only against the local stack (got ${host || 'no API URL'}). Run npm run db:start.`)
  }
  return { VITE_SUPABASE_URL: env.API_URL, VITE_SUPABASE_PUBLISHABLE_KEY: env.PUBLISHABLE_KEY }
}
