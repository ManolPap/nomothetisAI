import type { ConsultationReportArticleSection } from '../types'

export function ConsultationReportPreviewTable({
  participantsTotal,
  articles,
}: {
  participantsTotal: number
  articles: ConsultationReportArticleSection[]
}) {
  return (
    <div className="field23-preview-table-wrap">
      <table className="field23-preview-table">
        <tbody>
          <tr>
            <td className="field23-preview-table__index">23.</td>
            <td colSpan={3} className="field23-preview-table__heading">
              Σχόλια στο πλαίσιο της διαβούλευσης μέσω της ηλεκτρονικής πλατφόρμας <u>www.opengov.gr</u>{' '}
              <em>(ηλεκτρονική επισύναψη της έκθεσης)</em>
            </td>
          </tr>

          <tr>
            <td rowSpan={3} className="field23-preview-table__scope">
              Επί των άρθρων
              <br />
              της αξιολογούμενης ρύθμισης
            </td>
            <td className="field23-preview-table__label">Αριθμός συμμετασχόντων</td>
            <td colSpan={2} className="field23-preview-table__value field23-preview-table__value--numeric">
              {participantsTotal}
            </td>
          </tr>
          <tr>
            <td className="field23-preview-table__label">Σχόλια που υιοθετήθηκαν</td>
            <td colSpan={2} className="field23-preview-table__value">
              {buildSectionSummary(articles, 'adopted')}
            </td>
          </tr>
          <tr>
            <td className="field23-preview-table__label">
              Σχόλια που δεν υιοθετήθηκαν (συμπεριλαμβανόμενης επαρκούς αιτιολόγησης)
            </td>
            <td colSpan={2} className="field23-preview-table__value">
              {buildSectionSummary(articles, 'not_adopted')}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

function buildSectionSummary(
  articles: ConsultationReportArticleSection[],
  mode: 'adopted' | 'not_adopted',
): string {
  const entries = articles
    .map((article) => {
      if (mode === 'adopted' && !article.adopted_summary.trim()) return null
      if (mode === 'not_adopted' && !article.not_adopted_summary.trim()) return null
      const text = mode === 'adopted' ? article.adopted_summary : article.not_adopted_summary
      return `Άρθρο ${article.article_number}: ${text.trim()}`
    })
    .filter((item): item is string => Boolean(item))

  if (entries.length === 0) {
    return mode === 'adopted'
      ? 'Δεν καταγράφηκαν υιοθετημένες παρατηρήσεις.'
      : 'Δεν καταγράφηκαν μη υιοθετημένες παρατηρήσεις.'
  }

  return entries.join('\n\n')
}
