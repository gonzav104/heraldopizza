/// <reference types="vite/client" />

/** Build-time settings of the public menu, all public by design: the URL, the publishable key, and a switch. */
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string
  /** «true» offers the real WhatsApp link (P6b). Unset everywhere until the owner authorizes it. */
  readonly VITE_WHATSAPP_ENABLED?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
