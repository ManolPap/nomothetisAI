import { type Dispatch, useCallback, useEffect, useState } from 'react'
import { StepHeader } from '../../../shared/ui/StepHeader'
import { StepContainer } from '../../../shared/ui/StepContainer'
import { FileUploader } from '../../../shared/ui/FileUploader'
import { ErrorBanner } from '../../../shared/ui/ErrorBanner'
import { isApiError } from '../../../shared/api/errors'
import { useLawFiles } from '../../../app/providers/LawFilesProvider'
import { extractMetadata } from '../api'
import type { Field6Action, Field6State } from '../state/reducer'
import type { LawMetadata } from '../types'

interface Props {
  state: Field6State
  dispatch: Dispatch<Field6Action>
}

export function Step1Upload({ state, dispatch }: Props) {
  const { finalLawFile, setFinalLawFile } = useLawFiles()
  const [editedMetadata, setEditedMetadata] = useState<LawMetadata | null>(state.metadata)

  const handleFile = useCallback(async (file: File) => {
    setFinalLawFile(file)
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
  }, [dispatch, setFinalLawFile])

  function handleMetadataChange(field: keyof LawMetadata, value: string) {
    const updated = { ...(editedMetadata ?? {}), [field]: value } as LawMetadata
    setEditedMetadata(updated)
    dispatch({ type: 'UPDATE_METADATA', metadata: updated })
  }

  const canContinue = state.metadataStatus === 'ready' && !!state.metadata
  const isLoading = state.metadataStatus === 'loading'

  useEffect(() => {
    if (!finalLawFile) return
    if (!state.file || state.file.name !== finalLawFile.name || state.file.size !== finalLawFile.size || state.file.lastModified !== finalLawFile.lastModified) {
      dispatch({ type: 'SET_FILE', file: finalLawFile })
    }
  }, [dispatch, finalLawFile, state.file])

  useEffect(() => {
    if (state.file && state.metadataStatus === 'idle') {
      void handleFile(state.file)
    }
  }, [handleFile, state.file, state.metadataStatus])

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
              ['topic', 'Θέμα'],
              ['ministry', 'Υπουργείο'],
              ['sector', 'Τομέας'],
              ['measures', 'Μέτρα'],
              ['directive', 'Οδηγία ΕΕ'],
            ] as [keyof LawMetadata, string][]).map(([key, label]) => (
              <label key={key} className="form-field">
                <span className="form-field__label">{label}</span>
                <textarea
                  className="form-field__textarea"
                  rows={1}
                  value={String(editedMetadata[key] ?? '')}
                  ref={(el) => { if (el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px' } }}
                  onInput={(e) => { const el = e.currentTarget; el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px' }}
                  style={{ resize: 'none', overflow: 'hidden', minHeight: '36px' }}
                  onChange={(e) => handleMetadataChange(key, e.target.value)}
                />
              </label>
            ))}
          </div>
        </div>
      )}
    </StepContainer>
  )
}
