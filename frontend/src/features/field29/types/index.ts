export interface Field29Row {
  article: string
  change_type: string
  evaluated_provision: string
  existing_provision: string
}

export interface AnalyzeField29Response {
  filename: string
  articles_count: number
  field_29_articles_count: number
  field_29_rows?: Field29Row[]
  field_29_answer: string
}
