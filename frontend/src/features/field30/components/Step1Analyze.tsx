import { type Dispatch, useCallback, useEffect } from 'react'
import { useLawFiles } from '../../../app/providers/LawFilesProvider'
import { isApiError } from '../../../shared/api/errors'
import { EmptyState } from '../../../shared/ui/EmptyState'
import { ErrorBanner } from '../../../shared/ui/ErrorBanner'
import { LoadingPanel } from '../../../shared/ui/LoadingPanel'
import { StepContainer } from '../../../shared/ui/StepContainer'
import { StepHeader } from '../../../shared/ui/StepHeader'
import { analyzeField30 } from '../api'
import type { Field30Action, Field30State } from '../state/reducer'
import { Field30ResultTable } from './Field30ResultTable'

interface Props {
  state: Field30State
  dispatch: Dispatch<Field30Action>
}

export function Step1Analyze({ state, dispatch }: Props) {
  const { finalLawFile } = useLawFiles()

  const runAnalysis = useCallback(async (file: File) => {
    dispatch({ type: 'ANALYZE_LOADING' })
    try {
      const result = await analyzeField30(file)
      dispatch({ type: 'ANALYZE_SUCCESS', payload: result })
    } catch (e) {
      const msg = isApiError(e) ? e.userMessage() : 'Άγνωστο σφάλμα'
      dispatch({ type: 'ANALYZE_ERROR', error: msg })
    }
  }, [dispatch])

  useEffect(() => {
    if (!finalLawFile) return
    if (
      !state.file ||
      state.file.name !== finalLawFile.name ||
      state.file.size !== finalLawFile.size ||
      state.file.lastModified !== finalLawFile.lastModified
    ) {
      dispatch({ type: 'SET_FILE', file: finalLawFile })
    }
  }, [dispatch, finalLawFile, state.file])

  useEffect(() => {
    if (state.file && state.analyzeStatus === 'idle') {
      void runAnalysis(state.file)
    }
  }, [runAnalysis, state.analyzeStatus, state.file])

  const isLoading = state.analyzeStatus === 'loading'
  const displayedFileName = state.file?.name ?? state.fileMeta?.name
  const canComplete = state.analyzeStatus === 'ready' && Boolean(state.result)

  return (
    <StepContainer
      onNext={
        !state.flowCompleted && canComplete
          ? () => dispatch({ type: 'MARK_FLOW_COMPLETED' })
          : undefined
      }
      nextLabel="Ολοκληρώθηκε"
      nextClassName="btn-field23-complete"
      nextDisabled={false}
      isLoading={isLoading}
      showContinueHome={state.flowCompleted}
    >
      <StepHeader
        title="Ανάλυση Πεδίου 30"
        stepNumber={1}
        totalSteps={1}
        description="Χρησιμοποιείται το PDF από το πεδίο «Σχέδιο νόμου για την αιτιολογική έκθεση» της αρχικής σελίδας."
      />

      {displayedFileName ? (
        <div className="status-pill status-pill--ok">
          PDF: {displayedFileName}
        </div>
      ) : (
        <EmptyState message="Επιλέξτε πρώτα το PDF από την αρχική σελίδα." />
      )}

      {isLoading && <LoadingPanel message="Γίνεται σύνταξη του πίνακα καταργούμενων διατάξεων..." />}

      {state.analyzeError && (
        <ErrorBanner
          message={state.analyzeError}
          onRetry={() => state.file && runAnalysis(state.file)}
        />
      )}

      {state.result && (
        <section className="field29-result" aria-live="polite">
          <div className="field29-result__meta">
            <span>{state.result.filename}</span>
            <span>{state.result.articles_count} άρθρα</span>
            <span>{state.result.field_30_articles_count} σχετικά με το Πεδίο 30</span>
          </div>
          {state.analyzeStatus === 'ready' && state.file && (
            <p className="field30-result-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => dispatch({ type: 'RERUN_ANALYSIS' })}
                disabled={isLoading}
              >
                Επανάλυση
              </button>
            </p>
          )}
          <Field30ResultTable rows={state.result.field_30_rows} fallbackText={state.result.field_30_answer} />
        </section>
      )}

      <div className="field6-step4-complete">
        {state.flowCompleted && (
          <p className="field6-step4-complete__done" role="status">
            Η ροή σημειώθηκε ως ολοκληρωμένη στην αρχική.
          </p>
        )}
      </div>
    </StepContainer>
  )
}
