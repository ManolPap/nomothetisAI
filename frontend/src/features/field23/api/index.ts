import { postFormData, postJson, LONG_TIMEOUT_MS } from '../../../shared/api/client'
import { buildUrl } from '../../../shared/utils/buildUrl'
import type {
  ArticleChangeCommentsItem,
  AttributeLegislativeCommentsResponse,
  CompareLawsRequest,
  CompareLawsResponse,
  SplitLawResponse,
} from '../types'

export function splitLaw(file: File, signal?: AbortSignal): Promise<SplitLawResponse> {
  const form = new FormData()
  form.append('law_pdf', file)
  return postFormData<SplitLawResponse>(buildUrl('/api/field-23/split-law'), form, {
    signal,
    timeoutMs: LONG_TIMEOUT_MS,
  })
}

export function compareLaws(
  payload: CompareLawsRequest,
  signal?: AbortSignal,
): Promise<CompareLawsResponse> {
  return postJson<CompareLawsResponse>(buildUrl('/api/field-23/compare-laws'), payload, { signal })
}

export function attributeComments(
  payload: { items: ArticleChangeCommentsItem[]; model?: string },
  signal?: AbortSignal,
): Promise<AttributeLegislativeCommentsResponse> {
  return postJson<AttributeLegislativeCommentsResponse>(
    buildUrl('/api/field-23/attribute-legislative-comments'),
    payload,
    { signal, timeoutMs: LONG_TIMEOUT_MS },
  )
}
