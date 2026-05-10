import { LONG_TIMEOUT_MS, postFormData } from '../../../shared/api/client'
import { buildUrl } from '../../../shared/utils/buildUrl'
import type { AnalyzeField30Response } from '../types'

export function analyzeField30(file: File, signal?: AbortSignal): Promise<AnalyzeField30Response> {
  const form = new FormData()
  form.append('file', file)
  return postFormData<AnalyzeField30Response>(buildUrl('/api/field-30/analyze'), form, {
    signal,
    timeoutMs: LONG_TIMEOUT_MS * 4,
  })
}
