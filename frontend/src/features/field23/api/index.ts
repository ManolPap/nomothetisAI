import { postFormData, postJson, LONG_TIMEOUT_MS, VERY_LONG_TIMEOUT_MS } from '../../../shared/api/client'
import { buildUrl } from '../../../shared/utils/buildUrl'
import type {
  ArticleChangeCommentsItem,
  AttributeLegislativeCommentsResponse,
  CompareLawsRequest,
  CompareLawsResponse,
  GenerateConsultationReportRequest,
  GenerateConsultationReportResponse,
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
  return postJson<CompareLawsResponse>(buildUrl('/api/field-23/compare-laws'), payload, {
    signal,
    timeoutMs: VERY_LONG_TIMEOUT_MS,
  })
}

export function attributeComments(
  payload: { items: ArticleChangeCommentsItem[]; model?: string },
  signal?: AbortSignal,
): Promise<AttributeLegislativeCommentsResponse> {
  return postJson<AttributeLegislativeCommentsResponse>(
    buildUrl('/api/field-23/attribute-legislative-comments'),
    payload,
    { signal, timeoutMs: VERY_LONG_TIMEOUT_MS },
  )
}

export function generateConsultationReport(
  payload: GenerateConsultationReportRequest,
  signal?: AbortSignal,
): Promise<GenerateConsultationReportResponse> {
  return postJson<GenerateConsultationReportResponse>(
    buildUrl('/api/field-23/generate-consultation-report'),
    payload,
    { signal, timeoutMs: VERY_LONG_TIMEOUT_MS },
  )
}
