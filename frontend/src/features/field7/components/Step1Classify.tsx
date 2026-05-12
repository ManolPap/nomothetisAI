import { type Dispatch, useCallback, useEffect } from 'react'
import { StepHeader } from '../../../shared/ui/StepHeader'
import { StepContainer } from '../../../shared/ui/StepContainer'
import { FileUploader } from '../../../shared/ui/FileUploader'
import { LoadingPanel } from '../../../shared/ui/LoadingPanel'
import { ErrorBanner } from '../../../shared/ui/ErrorBanner'
import { EmptyState } from '../../../shared/ui/EmptyState'
import { isApiError } from '../../../shared/api/errors'
import { useLawFiles } from '../../../app/providers/LawFilesProvider'
import { classifySDG } from '../api'
import type { Field7Action, Field7State } from '../state/reducer'

interface Props {
  state: Field7State
  dispatch: Dispatch<Field7Action>
}

export function Step1Classify({ state, dispatch }: Props) {
  const { finalLawFile, setFinalLawFile } = useLawFiles()

  const handleFile = useCallback(async (file: File) => {
    setFinalLawFile(file)
    dispatch({ type: 'SET_FILE', file })
    dispatch({ type: 'CLASSIFY_LOADING' })
    try {
      const result = await classifySDG(file)
      dispatch({ type: 'CLASSIFY_SUCCESS', payload: result })
    } catch (e) {
      const msg = isApiError(e) ? e.userMessage() : 'Άγνωστο σφάλμα'
      dispatch({ type: 'CLASSIFY_ERROR', error: msg })
    }
  }, [dispatch, setFinalLawFile])

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
    if (state.file && state.classifyStatus === 'idle') {
      void handleFile(state.file)
    }
  }, [handleFile, state.file, state.classifyStatus])

  const isLoading = state.classifyStatus === 'loading'
  const hasMatches = state.matches.length > 0
  const acceptedCount = Object.values(state.decisions).filter((d) => d === 'accepted').length
  const rejectedCount = Object.values(state.decisions).filter((d) => d === 'rejected').length
  const allReviewed = hasMatches && state.matches.every((m) => state.decisions[m.sdg_id] !== 'pending')
  const canContinue = state.classifyStatus === 'ready' && (allReviewed || !hasMatches)

  return (
    <StepContainer
      onNext={() => dispatch({ type: 'GO_TO_STEP', step: 2 })}
      nextDisabled={!canContinue}
      isLoading={isLoading}
      nextLabel="Συνέχεια στο αποτέλεσμα →"
    >
      <StepHeader
        title="Έλεγχος αντιστοίχισης SDGs"
        stepNumber={1}
        totalSteps={2}
      />

      <FileUploader
        label="Επιλέξτε PDF νόμου"
        onFile={handleFile}
        disabled={isLoading}
        currentFile={state.file}
      />

      {isLoading && <LoadingPanel message="Αντιστοίχιση με τους 17 SDGs…" />}

      {state.classifyError && state.classifyStatus === 'error' && (
        <ErrorBanner
          message={state.classifyError}
          onRetry={() => state.file && handleFile(state.file)}
        />
      )}

      {state.classifyStatus === 'ready' && !hasMatches && (
        <EmptyState message="Δεν βρέθηκαν SDGs που να ταιριάζουν ουσιαστικά με τον νόμο." />
      )}

      {state.classifyStatus === 'ready' && hasMatches && (
        <div className="field7-review">
          <p className="field7-review__summary" role="status">
            Βρέθηκαν {state.matches.length} SDGs · Αποδεκτά: {acceptedCount} · Απορριφθέντα: {rejectedCount}
          </p>

          <ul className="field7-cards">
            {state.matches.map((match) => {
              const decision = state.decisions[match.sdg_id] ?? 'pending'
              return (
                <li
                  key={match.sdg_id}
                  className={`field7-card field7-card--${decision} field7-card--sdg-${match.sdg_id}`}
                >
                  <header className="field7-card__header">
                    <span
                      className={`field7-badge field7-badge--sdg-${match.sdg_id}`}
                      aria-label={`SDG ${match.sdg_id}`}
                    >
                      {match.sdg_id}
                    </span>
                    <h3 className="field7-card__title">{match.sdg_title}</h3>
                  </header>

                  <ul className="field7-subtargets">
                    {match.subtargets.map((sub) => (
                      <li key={sub.code} className="field7-subtarget">
                        <p className="field7-subtarget__head">
                          <span className="field7-subtarget__code">{sub.code}</span>
                          <span className="field7-subtarget__title">{sub.title}</span>
                        </p>
                        <p className="field7-subtarget__reasoning">{sub.reasoning}</p>
                      </li>
                    ))}
                  </ul>

                  <footer className="field7-card__actions">
                    <button
                      type="button"
                      className={`btn btn-field7-accept${decision === 'accepted' ? ' is-active' : ''}`}
                      onClick={() => dispatch({ type: 'SET_DECISION', sdgId: match.sdg_id, decision: 'accepted' })}
                      aria-pressed={decision === 'accepted'}
                    >
                      Αποδοχή
                    </button>
                    <button
                      type="button"
                      className={`btn btn-field7-reject${decision === 'rejected' ? ' is-active' : ''}`}
                      onClick={() => dispatch({ type: 'SET_DECISION', sdgId: match.sdg_id, decision: 'rejected' })}
                      aria-pressed={decision === 'rejected'}
                    >
                      Απόρριψη
                    </button>
                  </footer>
                </li>
              )
            })}
          </ul>

          {!allReviewed && (
            <p className="hint-text" role="status">
              Πρέπει να αποδεχτείτε ή να απορρίψετε όλα τα προτεινόμενα SDGs πριν συνεχίσετε.
            </p>
          )}
        </div>
      )}
    </StepContainer>
  )
}
