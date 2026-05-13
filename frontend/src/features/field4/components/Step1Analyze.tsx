import { type Dispatch, useCallback, useEffect } from 'react'
import { StepHeader } from '../../../shared/ui/StepHeader'
import { StepContainer } from '../../../shared/ui/StepContainer'
import { ErrorBanner } from '../../../shared/ui/ErrorBanner'
import { LoadingPanel } from '../../../shared/ui/LoadingPanel'
import { EmptyState } from '../../../shared/ui/EmptyState'
import { isApiError } from '../../../shared/api/errors'
import { useLawFiles } from '../../../app/providers/LawFilesProvider'
import { analyzeField4 } from '../api'
import { Field4ResultTable } from './Field4ResultTable'
import type { Field4Action, Field4State } from '../state/reducer'

interface Props {
  state: Field4State
  dispatch: Dispatch<Field4Action>
}

export function Step1Analyze({ state, dispatch }: Props) {
  const { finalLawFile } = useLawFiles()

  const runAnalysis = useCallback(async (file: File) => {
    dispatch({ type: 'ANALYZE_LOADING' })
    try {
      const result = await analyzeField4(file)
      dispatch({ type: 'ANALYZE_SUCCESS', payload: result })
    } catch (e) {
      const msg = isApiError(e) ? e.userMessage() : 'Άγνωστο σφάλμα'
      dispatch({ type: 'ANALYZE_ERROR', error: msg })
    }
  }, [dispatch])

  useEffect(() => {
    if (!finalLawFile) return
    if (!state.file || state.file.name !== finalLawFile.name || state.file.size !== finalLawFile.size || state.file.lastModified !== finalLawFile.lastModified) {
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
        title="Ανάλυση Πεδίου 4"
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

      {isLoading && <LoadingPanel message="Γίνεται ανάλυση του νομοσχεδίου..." />}

      {state.analyzeError && (
        <ErrorBanner
          message={state.analyzeError}
          onRetry={() => state.file && runAnalysis(state.file)}
        />
      )}

      {state.result && (
        <section className="field4-result" aria-live="polite">
          <div className="field4-result__meta">
            <span>{state.result.filename}</span>
            <span>{state.result.articles_count} άρθρα</span>
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
          <Field4ResultTable answer={state.result.field_4_answer} />
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
