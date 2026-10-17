import { execFileSync } from 'node:child_process'

/** Leaves the LOCAL database as the seed defines it, so other suites (pgTAP) do not start from E2E edits. */
export default function globalTeardown() {
  execFileSync('npx', ['supabase', 'db', 'reset'], { stdio: 'inherit' })
}
