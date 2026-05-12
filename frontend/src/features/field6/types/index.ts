export interface LawMetadata {
  topic: string
  ministry: string
  sector: string
  measures: string
  directive: string
}

export interface WebSource {
  url: string
  title?: string
  snippet?: string
}

export interface MetadataResponse {
  metadata: LawMetadata
  nim_text: string
}

export type FactCategory = 'i' | 'ii' | 'iii'

export interface FactItem {
  id: string
  category: FactCategory
  subject: string
  instrument: string
  finding: string
  source_url: string
  source_title?: string | null
}

export interface FactsPayload {
  i: FactItem[]
  ii: FactItem[]
  iii: FactItem[]
}

export interface WebSearchResponse {
  sources: WebSource[]
  facts: FactsPayload
  facts_text: string
}

export interface EurostatCountryEntry {
  name: string
  values: Record<string, number>
  indicator: string
  dataset_id: string
  url: string
}

export interface EurostatResponse {
  eurostat_data: Record<string, EurostatCountryEntry>
  indicator_name: string
}

export interface SynthesizeResponse {
  field6_text: string
  word_count: number
}
