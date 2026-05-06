import { postFormData, postJson } from '../../../shared/api/client'
import { buildUrl } from '../../../shared/utils/buildUrl'
import type {
  EurostatResponse,
  LawMetadata,
  MetadataResponse,
  SynthesizeResponse,
  WebSearchResponse,
  WebSource,
} from '../types'

export function extractMetadata(file: File, signal?: AbortSignal): Promise<MetadataResponse> {
  const form = new FormData()
  form.append('file', file)
  return postFormData<MetadataResponse>(buildUrl('/field6/extract-metadata'), form, { signal, timeoutMs: 120_000 })
}

export function webSearch(
  payload: { metadata: LawMetadata; nim_text: string },
  signal?: AbortSignal,
): Promise<WebSearchResponse> {
  return postJson<WebSearchResponse>(buildUrl('/field6/web-search'), payload, { signal, timeoutMs: 120_000 })
}

export function fetchEurostat(
  payload: { metadata: LawMetadata; facts_text: string },
  signal?: AbortSignal,
): Promise<EurostatResponse> {
  return postJson<EurostatResponse>(buildUrl('/field6/eurostat'), payload, { signal, timeoutMs: 120_000 })
}

export function synthesizeField6(
  payload: {
    metadata: LawMetadata
    facts_text: string
    eurostat_text: string
    selected_sources: WebSource[]
  },
  signal?: AbortSignal,
): Promise<SynthesizeResponse> {
  return postJson<SynthesizeResponse>(buildUrl('/field6/synthesize'), payload, { signal, timeoutMs: 120_000 })
}
