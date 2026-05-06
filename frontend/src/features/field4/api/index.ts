import { LONG_TIMEOUT_MS, postFormData } from '../../../shared/api/client'
import { buildUrl } from '../../../shared/utils/buildUrl'
import type { AnalyzeField4Response } from '../types'

export function analyzeField4(file: File, signal?: AbortSignal): Promise<AnalyzeField4Response> {
  const form = new FormData()
  form.append('file', file)
  return postFormData<AnalyzeField4Response>(buildUrl('/api/field-4/analyze'), form, {
    signal,
    timeoutMs: LONG_TIMEOUT_MS * 4,
  })
}
