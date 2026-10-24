/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_PASSPORT_BASE_URL?: string;
  readonly VITE_ZALO_APP_ID?: string;
}
