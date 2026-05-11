/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Public API origin (no trailing slash). Set on Vercel to your deployed API; redeploy after changes. */
  readonly VITE_API_BASE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
