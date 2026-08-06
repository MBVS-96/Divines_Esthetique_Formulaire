/// <reference types="vite/client" />

/** Build timestamp, injected by vite.config.ts. */
declare const __BUILD_STAMP__: string;

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_ADMIN_EMAIL?: string;
  readonly VITE_CONTACT_EMAIL?: string;
  readonly VITE_INSTAGRAM_URL?: string;
  readonly VITE_DEMO_ADMIN_PASSWORD?: string;
  readonly VITE_STANDALONE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
