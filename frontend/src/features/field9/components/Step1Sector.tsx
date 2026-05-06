import { type Dispatch } from 'react'
import { StepHeader } from '../../../shared/ui/StepHeader'
import { StepContainer } from '../../../shared/ui/StepContainer'
import { FileUploader } from '../../../shared/ui/FileUploader'
import { ErrorBanner } from '../../../shared/ui/ErrorBanner'
import { isApiError } from '../../../shared/api/errors'
import { extractSector } from '../api'
import type { Field9Action, Field9State } from '../state/reducer'

interface Props {
  state: Field9State
  dispatch: Dispatch<Field9Action>
}

export function Step1Sector({ state, dispatch }: Props) {
  async function handleFile(file: File) {
    dispatch({ type: 'SET_FILE', file })
    dispatch({ type: 'EXTRACT_LOADING' })
    try {
      const result = await extractSector(file)
      dispatch({ type: 'EXTRACT_SUCCESS', payload: result })
    } catch (e) {
      const msg = isApiError(e) ? e.userMessage() : 'Άγνωστο σφάλμα'
      dispatch({ type: 'EXTRACT_ERROR', error: msg })
    }
  }

  const yearValue = state.year?.toString() ?? ''
  const yearValid = state.year != null && state.year >= 1900 && state.year <= 2100
  const canContinue = state.extractStatus === 'ready' && !!state.sector && yearValid && !!state.lawTitle
  const isLoading = state.extractStatus === 'loading'

  return (
    <StepContainer
      onNext={() => dispatch({ type: 'GO_TO_STEP', step: 2 })}
      nextDisabled={!canContinue}
      isLoading={isLoading}
    >
      <StepHeader title="Ανέβασμα PDF & Εξαγωγή Τομέα" stepNumber={1} totalSteps={3} />

      <FileUploader
        label="Επιλέξτε PDF νόμου"
        onFile={handleFile}
        disabled={isLoading}
        currentFile={state.file}
      />

      {state.extractError && (
        <ErrorBanner
          message={state.extractError}
          onRetry={() => state.file && handleFile(state.file)}
        />
      )}

      {state.extractStatus === 'ready' && (
        <div className="form-grid">
          <label className="form-field">
            <span className="form-field__label">Τομέας</span>
            <input
              className="form-field__input"
              type="text"
              value={state.sector}
              onChange={(e) => dispatch({ type: 'UPDATE_SECTOR', sector: e.target.value })}
            />
          </label>
          <label className="form-field">
            <span className="form-field__label">Έτος</span>
            <input
              className="form-field__input"
              type="number"
              min={1900}
              max={2100}
              value={yearValue}
              onChange={(e) => dispatch({ type: 'UPDATE_YEAR', year: parseInt(e.target.value, 10) })}
            />
            {yearValue && !yearValid && (
              <span className="form-field__error" role="alert">
                Μη έγκυρο έτος.
              </span>
            )}
          </label>
          <label className="form-field">
            <span className="form-field__label">Τίτλος Νόμου</span>
            <input
              className="form-field__input"
              type="text"
              value={state.lawTitle}
              onChange={(e) => dispatch({ type: 'UPDATE_LAW_TITLE', title: e.target.value })}
            />
          </label>
        </div>
      )}
    </StepContainer>
  )
}
