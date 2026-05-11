import { env } from './app/config/env'

export const API_BASE_URL = env.apiBase

export const apiUrl = (path: string): string => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${API_BASE_URL}${normalizedPath}`
}
