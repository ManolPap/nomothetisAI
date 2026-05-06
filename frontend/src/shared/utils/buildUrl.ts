import { env } from '../../app/config/env'

export function buildUrl(path: string): string {
  const normalised = path.startsWith('/') ? path : `/${path}`
  return `${env.apiBase}${normalised}`
}
