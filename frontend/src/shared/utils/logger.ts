const isDev = import.meta.env.DEV

export const logger = {
  request(endpoint: string, status: number, durationMs: number) {
    if (!isDev) return
    console.info(`[API] ${endpoint} → ${status} (${durationMs}ms)`)
  },
  timeout(endpoint: string) {
    if (!isDev) return
    console.warn(`[API] timeout: ${endpoint}`)
  },
  retry(endpoint: string, attempt: number) {
    if (!isDev) return
    console.info(`[API] retry #${attempt}: ${endpoint}`)
  },
  error(endpoint: string, err: unknown) {
    if (!isDev) return
    console.error(`[API] error: ${endpoint}`, err)
  },
}
