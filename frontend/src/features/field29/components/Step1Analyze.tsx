import { type Dispatch, useCallback, useEffect } from 'react'
import { useLawFiles } from '../../../app/providers/LawFilesProvider'
import { isApiError } from '../../../shared/api/errors'
import { EmptyState } from '../../../shared/ui/EmptyState'
import { ErrorBanner } from '../../../shared/ui/ErrorBanner'
import { LoadingPanel } from '../../../shared/ui/LoadingPanel'
import { StepContainer } from '../../../shared/ui/StepContainer'
import { StepHeader } from '../../../shared/ui/StepHeader'
import { analyzeField29 } from '../api'
import type { Field29Action, Field29State } from '../state/reducer'
import { Field29ResultTable } from './Field29ResultTable'

interface Props {
  state: Field29State
  dispatch: Dispatch<Field29Action>
}

export function Step1Analyze({ state, dispatch }: Props) {
  const { finalLawFile } = useLawFiles()

  const runAnalysis = useCallback(async (file: File) => {
    dispatch({ type: 'ANALYZE_LOADING' })
    try {
      const result = await analyzeField29(file)
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

  return (
    <StepContainer
      onNext={() => state.file && runAnalysis(state.file)}
      nextLabel={state.result ? 'Επανάλυση' : 'Ανάλυση'}
      nextDisabled={!state.file || isLoading}
      isLoading={isLoading}
    >
      <StepHeader
        title="Ανάλυση Πεδίου 29"
        stepNumber={1}
        totalSteps={1}
        description="Χρησιμοποιείται το PDF από το πεδίο «Σχέδιο νόμου για την αιτιολογική έκθεση» της αρχικής σελίδας."
      />

      {state.file ? (
        <div className="status-pill status-pill--ok">
          PDF: {state.file.name}
        </div>
      ) : (
        <EmptyState message="Επιλέξτε πρώτα το PDF από την αρχική σελίδα." />
      )}

      {isLoading && <LoadingPanel message="Γίνεται σύνταξη του πίνακα τροποποιούμενων διατάξεων..." />}

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
            <span>{state.result.field_29_articles_count} σχετικά με το Πεδίο 29</span>
          </div>
          <Field29ResultTable
            value={state.result.field_29_answer}
            rows={state.result.field_29_rows}
          />
        </section>
      )}
    </StepContainer>
  )
}
