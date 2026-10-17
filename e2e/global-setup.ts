import { execFileSync } from 'node:child_process'
import { ADMIN_EMAIL, ADMIN_PASSWORD } from './local-admin.ts'

/**
 * Starts every E2E run from the seed: resets the LOCAL database (migrations + seed) and creates the test administrator.
 * Local only: `supabase db reset` without --linked never touches a remote project, and the admin script refuses
 * any non-local API.
 */
export default function globalSetup() {
  execFileSync('npx', ['supabase', 'db', 'reset'], { stdio: 'inherit' })
  execFileSync('node', ['scripts/crear-admin-local.mjs'], {
    stdio: 'inherit',
    env: { ...process.env, ADMIN_EMAIL, ADMIN_PASSWORD },
  })
}
