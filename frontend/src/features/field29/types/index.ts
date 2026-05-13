export interface Field29AffectedProvision {
  affected_reference: string
  change_type: string
  law_type: string | null
  law_number: string | null
  fek: string | null
  article: string | null
  paragraph: string | null
  case: string | null
  legal_code: string | null
}

export interface Field29MatchedChunk {
  source_file: string
  law_type: string | null
  law_number: string | null
  law_year: string | null
  fek: string | null
  legal_code: string | null
  article: string
  paragraph: string | null
  case: string | null
  text: string
}

export interface Field29Row {
  source_article: string
  source_article_title: string
  evaluated_provision: string
  affected_provisions: Field29AffectedProvision[]
  existing_provisions_text?: string
  matched_chunks?: Field29MatchedChunk[]
}

export interface LegacyField29Row {
  article: string
  change_type: string
  evaluated_provision: string
  existing_provision: string
}

export interface AnalyzeField29Response {
  filename: string
  total_articles: number
  field_29_articles_count: number
  rows: Field29Row[]
  articles_count?: number
  field_29_rows?: LegacyField29Row[]
  field_29_answer?: string
}
