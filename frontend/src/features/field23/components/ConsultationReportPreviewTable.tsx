import type { Dispatch } from 'react'
import type { ConsultationReportArticleSection } from '../types'
import type { Field23Action, Field23ReportDraft, Field23ReportPreviewCells } from '../state/reducer'

export function ConsultationReportPreviewTable({
  draft,
  dispatch,
  readOnly = false,
}: {
  draft: Field23ReportDraft
  dispatch?: Dispatch<Field23Action>
  readOnly?: boolean
}) {
  const { totals, articles_section: articles, previewCells } = draft
  const participantsDisplay =
    previewCells.participants ?? String(totals.participants_total ?? '')
  const adoptedDisplay = previewCells.adopted ?? buildSectionSummary(articles, 'adopted')
  const notAdoptedDisplay = previewCells.not_adopted ?? buildSectionSummary(articles, 'not_adopted')

  const isReadOnly = readOnly || !dispatch

  function setCell(cell: keyof Field23ReportPreviewCells, value: string) {
    if (!dispatch) return
    dispatch({ type: 'SET_REPORT_PREVIEW_CELL', cell, value })
  }

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
              {isReadOnly ? (
                participantsDisplay
              ) : (
                <input
                  type="text"
                  inputMode="numeric"
                  className="field23-preview-table__control field23-preview-table__control--numeric"
                  aria-label="Αριθμός συμμετεχόντων (προεπισκόπηση)"
                  value={participantsDisplay}
                  onChange={(e) => setCell('participants', e.target.value)}
                />
              )}
            </td>
          </tr>
          <tr>
            <td className="field23-preview-table__label">Σχόλια που υιοθετήθηκαν</td>
            <td colSpan={2} className="field23-preview-table__value">
              {isReadOnly ? (
                adoptedDisplay
              ) : (
                <textarea
                  className="field23-preview-table__control"
                  aria-label="Σχόλια που υιοθετήθηκαν (προεπισκόπηση)"
                  rows={6}
                  value={adoptedDisplay}
                  onChange={(e) => setCell('adopted', e.target.value)}
                />
              )}
            </td>
          </tr>
          <tr>
            <td className="field23-preview-table__label">
              Σχόλια που δεν υιοθετήθηκαν (συμπεριλαμβανόμενης επαρκούς αιτιολόγησης)
            </td>
            <td colSpan={2} className="field23-preview-table__value">
              {isReadOnly ? (
                notAdoptedDisplay
              ) : (
                <textarea
                  className="field23-preview-table__control"
                  aria-label="Σχόλια που δεν υιοθετήθηκαν (προεπισκόπηση)"
                  rows={8}
                  value={notAdoptedDisplay}
                  onChange={(e) => setCell('not_adopted', e.target.value)}
                />
              )}
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
