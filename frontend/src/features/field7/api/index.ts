import { postFormData } from '../../../shared/api/client'
import { buildUrl } from '../../../shared/utils/buildUrl'
import type { ClassifyResponse } from '../types'

export function classifySDG(file: File, signal?: AbortSignal): Promise<ClassifyResponse> {
  const form = new FormData()
  form.append('file', file)
  return postFormData<ClassifyResponse>(
    buildUrl('/api/field-7/classify'),
    form,
    { signal, timeoutMs: 180_000 },
  )
}
