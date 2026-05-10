export interface Field30Row {
  article: string
  item_label: string
  evaluated_provision: string
  repealed_provision: string
}

export interface AnalyzeField30Response {
  filename: string
  articles_count: number
  field_30_articles_count: number
  field_30_rows?: Field30Row[]
  field_30_answer: string
}
