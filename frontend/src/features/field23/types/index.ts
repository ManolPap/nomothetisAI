export interface ArticleOut {
  article_number: string
  header: string
  title: string
  body: string
}

export type ChangeType = 'added' | 'removed' | 'modified' | 'unchanged'

export interface DiffSegmentOut {
  operation: 'equal' | 'delete' | 'insert'
  text: string
}

export interface ArticleDiffOut {
  old_article: ArticleOut | null
  new_article: ArticleOut | null
  change_type: ChangeType
  similarity_score: number
  token_change_fraction: number
  segments: DiffSegmentOut[]
}

export interface SplitLawResponse {
  articles: ArticleOut[]
}

export interface CompareLawsRequest {
  initial_law_articles: ArticleOut[]
  final_law_articles: ArticleOut[]
  normalize_before_diff: boolean
}

export interface CompareLawsResponse {
  diffs: ArticleDiffOut[]
}

export interface CommentContributionOut {
  comment_id: string
  contribution_likelihood: 'none' | 'low' | 'medium' | 'high'
  rationale_el: string
}

export interface ArticleChangeCommentsItem {
  item_index: number
  initial_article: ArticleOut | null
  final_article: ArticleOut | null
  legislative_comments: string[]
}

export interface ItemAttributionOut {
  item_index: number
  contributions: CommentContributionOut[]
}

export interface AttributeLegislativeCommentsRequest {
  items: ArticleChangeCommentsItem[]
  model?: string
}

export interface AttributeLegislativeCommentsResponse {
  items: ItemAttributionOut[]
}
