export interface IndicatorSuggestion {
  dataset_id: string
  indicator_name: string
  description: string
  sector: string
  relevance_reason: string
}

export interface YearlyValue {
  year: number
  value: number | null
}

export interface IndicatorData {
  dataset_id: string
  indicator_name: string
  description: string
  values: YearlyValue[]
  unit: string
  eurostat_url: string
}

export interface ExtractSectorResponse {
  sector: string
  year: number
  law_title: string
}

export interface SuggestIndicatorsResponse {
  suggestions: IndicatorSuggestion[]
}

export interface FetchDataResponse {
  indicators: IndicatorData[]
  reference_year: number
  five_year_range: number[]
}
