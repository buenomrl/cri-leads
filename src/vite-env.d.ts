/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL publica das Edge Functions. Nao e' segredo — ver .env.example. */
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
