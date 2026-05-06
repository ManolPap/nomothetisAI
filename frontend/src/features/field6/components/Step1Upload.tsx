import { type Dispatch, useState } from 'react'
import { StepHeader } from '../../../shared/ui/StepHeader'
import { StepContainer } from '../../../shared/ui/StepContainer'
import { FileUploader } from '../../../shared/ui/FileUploader'
import { ErrorBanner } from '../../../shared/ui/ErrorBanner'
import { isApiError } from '../../../shared/api/errors'
import { extractMetadata } from '../api'
import type { Field6Action, Field6State } from '../state/reducer'
import type { LawMetadata } from '../types'

interface Props {
  state: Field6State
  dispatch: Dispatch<Field6Action>
}

export function Step1Upload({ state, dispatch }: Props) {
  const [editedMetadata, setEditedMetadata] = useState<LawMetadata | null>(state.metadata)

  async function handleFile(file: File) {
    dispatch({ type: 'SET_FILE', file })
    dispatch({ type: 'METADATA_LOADING' })
    try {
      const result = await extractMetadata(file)
      dispatch({ type: 'METADATA_SUCCESS', payload: result })
      setEditedMetadata(result.metadata)
    } catch (e) {
      const msg = isApiError(e) ? e.userMessage() : 'Άγνωστο σφάλμα'
      dispatch({ type: 'METADATA_ERROR', error: msg })
    }
  }

  function handleMetadataChange(field: keyof LawMetadata, value: string) {
    const updated = { ...(editedMetadata ?? {}), [field]: value } as LawMetadata
    setEditedMetadata(updated)
    dispatch({ type: 'UPDATE_METADATA', metadata: updated })
  }

  const canContinue = state.metadataStatus === 'ready' && !!state.metadata
  const isLoading = state.metadataStatus === 'loading'

  return (
    <StepContainer
      onNext={() => dispatch({ type: 'GO_TO_STEP', step: 2 })}
      nextDisabled={!canContinue}
      isLoading={isLoading}
    >
      <StepHeader title="Ανέβασμα PDF & Εξαγωγή Μεταδεδομένων" stepNumber={1} totalSteps={4} />

      <FileUploader
        label="Επιλέξτε PDF νόμου"
        onFile={handleFile}
        disabled={isLoading}
        currentFile={state.file}
      />

      {state.metadataError && (
        <ErrorBanner message={state.metadataError} onRetry={() => state.file && handleFile(state.file)} />
      )}

      {state.metadataStatus === 'ready' && editedMetadata && (
        <div className="metadata-form">
          <h3>Μεταδεδομένα Νόμου</h3>
          <div className="form-grid">
            {([
              ['title', 'Τίτλος'],
              ['law_number', 'Αριθμός Νόμου'],
              ['year', 'Έτος'],
              ['ministry', 'Υπουργείο'],
              ['fek_number', 'ΦΕΚ Αριθμός'],
              ['fek_date', 'Ημερομηνία ΦΕΚ'],
              ['subject', 'Θέμα'],
            ] as [keyof LawMetadata, string][]).map(([key, label]) => (
              <label key={key} className="form-field">
                <span className="form-field__label">{label}</span>
                <input
                  className="form-field__input"
                  type={key === 'year' ? 'number' : 'text'}
                  value={String(editedMetadata[key] ?? '')}
                  onChange={(e) => handleMetadataChange(key, e.target.value)}
                />
              </label>
            ))}
          </div>

          {state.nimText && (
            <div className="nim-text-block">
              <h4>Κείμενο NIM</h4>
              <pre className="nim-text-block__pre">{state.nimText}</pre>
            </div>
          )}
        </div>
      )}
    </StepContainer>
  )
}
