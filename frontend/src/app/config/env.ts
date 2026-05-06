const base = import.meta.env.VITE_API_BASE ?? 'http://127.0.0.1:8000'

export const env = {
  apiBase: base.replace(/\/$/, ''),
} as const
