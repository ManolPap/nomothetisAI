import type { Dispatch } from 'react'
import { StepContainer } from '../../../shared/ui/StepContainer'
import { StepHeader } from '../../../shared/ui/StepHeader'
import { ErrorBanner } from '../../../shared/ui/ErrorBanner'
import { isApiError } from '../../../shared/api/errors'
import { generateConsultationReport } from '../api'
import {
  initialField23ReportDraft,
  type Field23Action,
  type Field23State,
} from '../state/reducer'
import { buildConsultationReportPayload } from '../reportPayload'
import type { ConsultationReportArticleSection } from '../types'

const SUMMARY_WORD_LIMIT = 250

interface Props {
  state: Field23State
  dispatch: Dispatch<Field23Action>
}

function countWords(text: string): number {
  const normalized = text.trim()
  if (!normalized) return 0
  return normalized.split(/\s+/).length
}

export function Step5ConsultationReport({ state, dispatch }: Props) {
  const draft = state.reportDraft ?? initialField23ReportDraft
  const canComplete = state.reportStatus === 'ready' && draft.articles_section.length > 0

  async function onGenerateReport() {
    dispatch({ type: 'REPORT_GENERATION_LOADING' })
    try {
      const payload = buildConsultationReportPayload(state)
      const response = await generateConsultationReport(payload)
      dispatch({
        type: 'REPORT_GENERATION_SUCCESS',
        draft: {
          totals: response.totals,
          articles_section: response.articles_section,
          final_preview_text: response.final_preview_text,
          llm_status: response.llm_status,
        },
      })
    } catch (e) {
      dispatch({
        type: 'REPORT_GENERATION_ERROR',
        error: isApiError(e) ? e.userMessage() : 'Σφάλμα δημιουργίας έκθεσης.',
      })
    }
  }

  return (
    <StepContainer
      onBack={() => dispatch({ type: 'GO_TO_STEP', step: 3 })}
      onNext={() => dispatch({ type: 'MARK_FLOW_COMPLETED' })}
      nextLabel="Ολοκληρώθηκε"
      nextClassName="btn-field23-complete"
      nextDisabled={state.flowCompleted || !canComplete}
    >
      <StepHeader
        title="Πεδίο 23 — Έκθεση Διαβούλευσης"
        stepNumber={4}
        totalSteps={4}
        description="Δημιουργία άρθρο-κεντρικής έκθεσης και read-only προεπισκόπηση από backend."
      />

      <div className="field23-report-layout">
        <section className="field23-report-editor">
          <h3 className="field23-report-section-title">Επί της αρχής</h3>
          <div className="field23-report-principle-placeholder">
            <p>Η ενότητα «επί της αρχής» παραμένει απενεργοποιημένη σε αυτό το στάδιο.</p>
            <input type="text" value="Disabled in this phase" disabled aria-label="principle-placeholder" />
          </div>

          <h3 className="field23-report-section-title">Επί των άρθρων</h3>

          {state.reportError && <ErrorBanner message={state.reportError} onRetry={onGenerateReport} />}

          {draft.articles_section.length === 0 ? (
            <p className="field23-report-hint">
              Δεν υπάρχει ακόμη δομημένο άρθρο-επίπεδο draft. Γύρισε πίσω και πάτησε «Σύνταξη αναφοράς».
            </p>
          ) : (
            <div className="field23-article-commentary-list">
              <div className="field23-report-metadata">
                <label className="field23-report-field field23-report-field--compact field23-report-field--participants" htmlFor="field23-participants-total">
                  <span>Συμμετέχοντες</span>
                  <input
                    id="field23-participants-total"
                    type="text"
                    value={String(draft.totals.participants_total ?? '')}
                    placeholder="Αριθμός συμμετεχόντων"
                    readOnly
                    aria-readonly="true"
                  />
                </label>
              </div>
              <div className="field23-report-totals">
                <strong>Σύνολα:</strong> σχόλια {draft.totals.comments_total} • υιοθετημένα{' '}
                {draft.totals.adopted_total} • μη υιοθετημένα {draft.totals.not_adopted_total}
                {draft.llm_status ? ` • κατάσταση LLM: ${draft.llm_status}` : ''}
              </div>
              {draft.articles_section.map((row) => {
                const adoptedWords = countWords(row.adopted_summary)
                const notAdoptedWords = countWords(row.not_adopted_summary)
                const adoptedOverLimit = adoptedWords > SUMMARY_WORD_LIMIT
                const notAdoptedOverLimit = notAdoptedWords > SUMMARY_WORD_LIMIT
                return (
                  <article key={row.article_number} className="field23-article-commentary-card">
                    <p className="field23-article-commentary-card__title">
                      Άρθρο {row.article_number} - {row.article_title || '(Χωρίς τίτλο)'}
                    </p>
                    <p className="field23-report-hint">
                      Comments: {row.comment_count} • adopted: {row.adopted_count} • not adopted:{' '}
                      {row.not_adopted_count}
                    </p>

                    <div className="field23-report-field">
                      <span>Σχόλια που υιοθετήθηκαν (backend-generated, read-only)</span>
                      <p className="field23-report-readonly-text">
                        {row.adopted_summary || '—'}
                      </p>
                      <small className={adoptedOverLimit ? 'field23-word-count field23-word-count--over' : 'field23-word-count'}>
                        {adoptedWords}/{SUMMARY_WORD_LIMIT} λέξεις
                      </small>
                    </div>

                    <div className="field23-report-field">
                      <span>Σχόλια που δεν υιοθετήθηκαν (backend-generated, read-only)</span>
                      <p className="field23-report-readonly-text">
                        {row.not_adopted_summary || '—'}
                      </p>
                      <small className={notAdoptedOverLimit ? 'field23-word-count field23-word-count--over' : 'field23-word-count'}>
                        {notAdoptedWords}/{SUMMARY_WORD_LIMIT} λέξεις
                      </small>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </section>

        <section className="field23-report-preview" aria-live="polite">
          <h3 className="field23-report-section-title">Read-only preview</h3>
          {draft.articles_section.length === 0 ? (
            <pre>{draft.final_preview_text || 'Δεν υπάρχει ακόμα generated preview.'}</pre>
          ) : (
            <ConsultationReportPreviewTable
              participantsTotal={draft.totals.participants_total}
              articles={draft.articles_section}
            />
          )}
        </section>
      </div>
    </StepContainer>
  )
}

function ConsultationReportPreviewTable({
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
