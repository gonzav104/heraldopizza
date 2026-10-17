/// <reference types="vite/client" />

/** Build-time settings of the public menu. Both are public by design: the URL and the publishable key. */
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
