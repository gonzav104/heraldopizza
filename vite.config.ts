import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { loadEnv } from 'vite'
import { defineConfig } from 'vitest/config'
import { assertNoSecretInClientEnv } from './client-env-guard.ts'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Refuse to serve, build, or test when a VITE_ variable (inlined in the bundle) holds a server-only key (U4).
  assertNoSecretInClientEnv(loadEnv(mode, process.cwd(), 'VITE_'))

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      // Tests that render the whole menu (84 products) take 3–5 s in jsdom on a slow machine; the default 5 s would flake.
      testTimeout: 15_000,
      // The module cache reuses transformed files between runs, and import.meta.glob is resolved at transform time:
      // a cached copy of privacy-claims.test.ts kept an old file list and missed a new fetch() (false green, U3b).
      fsModuleCache: false,
    },
  }
})
