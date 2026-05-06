import { ApiError, type ApiErrorDetail } from './errors'
import { logger } from '../utils/logger'

const DEFAULT_TIMEOUT_MS = 10_000
export const LONG_TIMEOUT_MS = 35_000
export const VERY_LONG_TIMEOUT_MS = 300_000

async function parseErrorDetail(res: Response): Promise<ApiErrorDetail> {
  try {
    const body = await res.json()
    if (body && 'detail' in body) return body.detail as ApiErrorDetail
    return null
  } catch {
    return null
  }
}

async function handleResponse<T>(res: Response, endpoint: string, startedAt: number): Promise<T> {
  const duration = Date.now() - startedAt
  logger.request(endpoint, res.status, duration)

  if (res.ok) {
    return res.json() as Promise<T>
  }

  const detail = await parseErrorDetail(res)
  const message =
    typeof detail === 'string'
      ? detail
      : res.status === 422
        ? 'Validation error'
        : res.statusText || `HTTP ${res.status}`

  throw new ApiError(res.status, message, detail)
}

function withTimeout(signal: AbortSignal | undefined, timeoutMs: number): [AbortSignal, () => void] {
  const controller = new AbortController()
  const tid = setTimeout(() => controller.abort(), timeoutMs)
  const cleanup = () => clearTimeout(tid)

  if (signal) {
    signal.addEventListener('abort', () => controller.abort())
  }

  return [controller.signal, cleanup]
}

export async function getJson<T>(
  url: string,
  options?: { signal?: AbortSignal; timeoutMs?: number },
): Promise<T> {
  const [signal, cleanup] = withTimeout(options?.signal, options?.timeoutMs ?? DEFAULT_TIMEOUT_MS)
  const startedAt = Date.now()
  try {
    const res = await fetch(url, { signal, headers: { Accept: 'application/json' } })
    return handleResponse<T>(res, url, startedAt)
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw new ApiError(0, 'timeout', null)
    if (e instanceof ApiError) throw e
    throw new ApiError(0, 'network', null, e)
  } finally {
    cleanup()
  }
}

export async function postJson<T>(
  url: string,
  body: unknown,
  options?: { signal?: AbortSignal; timeoutMs?: number },
): Promise<T> {
  const [signal, cleanup] = withTimeout(options?.signal, options?.timeoutMs ?? DEFAULT_TIMEOUT_MS)
  const startedAt = Date.now()
  try {
    const res = await fetch(url, {
      method: 'POST',
      signal,
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
    })
    return handleResponse<T>(res, url, startedAt)
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw new ApiError(0, 'timeout', null)
    if (e instanceof ApiError) throw e
    throw new ApiError(0, 'network', null, e)
  } finally {
    cleanup()
  }
}

export async function postFormData<T>(
  url: string,
  formData: FormData,
  options?: { signal?: AbortSignal; timeoutMs?: number },
): Promise<T> {
  const [signal, cleanup] = withTimeout(options?.signal, options?.timeoutMs ?? DEFAULT_TIMEOUT_MS)
  const startedAt = Date.now()
  try {
    const res = await fetch(url, {
      method: 'POST',
      signal,
      headers: { Accept: 'application/json' },
      body: formData,
    })
    return handleResponse<T>(res, url, startedAt)
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw new ApiError(0, 'timeout', null)
    if (e instanceof ApiError) throw e
    throw new ApiError(0, 'network', null, e)
  } finally {
    cleanup()
  }
}
