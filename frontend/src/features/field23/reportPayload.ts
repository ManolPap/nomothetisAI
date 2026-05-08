import type { GenerateConsultationReportRequest } from './types'
import type { Field23State } from './state/reducer'

export function buildConsultationReportPayload(state: Field23State): GenerateConsultationReportRequest {
  const items = Object.entries(state.attributionResults)
    .map(([itemIndex, result]) => {
      const index = Number(itemIndex)
      const diff = state.diffs[index]
      if (!Number.isFinite(index) || !diff) return null
      const article_number = diff.new_article?.article_number ?? diff.old_article?.article_number ?? ''
      const article_title = diff.new_article?.title ?? diff.old_article?.title ?? ''
      if (!article_number) return null

      return {
        item_index: index,
        article_number,
        article_title,
        comments: result.contributions.map((contribution) => ({
          comment_id: contribution.comment_id,
          rationale_el: contribution.rationale_el,
          adopted: Boolean(contribution.adopted),
        })),
      }
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .filter((item) => item.comments.length > 0)

  return { items }
}
