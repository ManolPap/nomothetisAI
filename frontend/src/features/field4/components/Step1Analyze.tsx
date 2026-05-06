import { type Dispatch } from 'react'
import { StepHeader } from '../../../shared/ui/StepHeader'
import { StepContainer } from '../../../shared/ui/StepContainer'
import { FileUploader } from '../../../shared/ui/FileUploader'
import { ErrorBanner } from '../../../shared/ui/ErrorBanner'
import { LoadingPanel } from '../../../shared/ui/LoadingPanel'
import { isApiError } from '../../../shared/api/errors'
import { analyzeField4 } from '../api'
import type { Field4Action, Field4State } from '../state/reducer'

interface Props {
  state: Field4State
  dispatch: Dispatch<Field4Action>
}

export function Step1Analyze({ state, dispatch }: Props) {
  async function runAnalysis(file: File) {
    dispatch({ type: 'ANALYZE_LOADING' })
    try {
      const result = await analyzeField4(file)
      dispatch({ type: 'ANALYZE_SUCCESS', payload: result })
    } catch (e) {
      const msg = isApiError(e) ? e.userMessage() : 'Άγνωστο σφάλμα'
      dispatch({ type: 'ANALYZE_ERROR', error: msg })
    }
  }

  async function handleFile(file: File) {
    dispatch({ type: 'SET_FILE', file })
    await runAnalysis(file)
  }

  const isLoading = state.analyzeStatus === 'loading'

  return (
    <StepContainer
      onNext={() => state.file && runAnalysis(state.file)}
      nextLabel={state.result ? 'Επανάλυση' : 'Ανάλυση'}
      nextDisabled={!state.file || isLoading}
      isLoading={isLoading}
    >
      <StepHeader
        title="Ανάλυση Πεδίου 4"
        stepNumber={1}
        totalSteps={1}
        description="Ανέβασε PDF νομοσχεδίου για έλεγχο νομοθετικών αναφορών."
      />

      <FileUploader
        label="Επιλέξτε PDF νομοσχεδίου"
        onFile={handleFile}
        disabled={isLoading}
        currentFile={state.file}
      />

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
          <pre className="field4-result__text">{state.result.field_4_answer}</pre>
        </section>
      )}
    </StepContainer>
  )
}
