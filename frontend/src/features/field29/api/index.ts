import { LONG_TIMEOUT_MS, postFormData } from '../../../shared/api/client'
import { buildUrl } from '../../../shared/utils/buildUrl'
import type { AnalyzeField29Response } from '../types'

export function analyzeField29(file: File, signal?: AbortSignal): Promise<AnalyzeField29Response> {
  const form = new FormData()
  form.append('file', file)
  return postFormData<AnalyzeField29Response>(buildUrl('/api/field-29/analyze'), form, {
    signal,
    timeoutMs: LONG_TIMEOUT_MS * 4,
  })
}
