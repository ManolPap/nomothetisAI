const raw = import.meta.env.VITE_API_BASE
const base =
  typeof raw === 'string' && raw.trim() !== ''
    ? raw.trim().replace(/\/+$/, '')
    : 'http://127.0.0.1:8000'

export const env = {
  apiBase: base,
} as const
