import { postFormData, postJson } from '../../../shared/api/client'
import { buildUrl } from '../../../shared/utils/buildUrl'
import type {
  ExtractSectorResponse,
  FetchDataResponse,
  SuggestIndicatorsResponse,
} from '../types'

export function extractSector(file: File, signal?: AbortSignal): Promise<ExtractSectorResponse> {
  const form = new FormData()
  form.append('file', file)
  return postFormData<ExtractSectorResponse>(buildUrl('/field9/extract-sector'), form, { signal, timeoutMs: 120_000 })
}

export function suggestIndicators(
  payload: { sector: string; year: number; law_title: string },
  signal?: AbortSignal,
): Promise<SuggestIndicatorsResponse> {
  return postJson<SuggestIndicatorsResponse>(buildUrl('/field9/suggest-indicators'), payload, { signal, timeoutMs: 120_000 })
}

export function fetchIndicatorData(
  payload: { selected_indicators: string[]; year: number },
  signal?: AbortSignal,
): Promise<FetchDataResponse> {
  return postJson<FetchDataResponse>(buildUrl('/field9/fetch-data'), payload, { signal, timeoutMs: 120_000 })
}
