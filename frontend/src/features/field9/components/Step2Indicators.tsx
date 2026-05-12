import { type Dispatch, useEffect } from 'react'
import { StepHeader } from '../../../shared/ui/StepHeader'
import { StepContainer } from '../../../shared/ui/StepContainer'
import { LoadingPanel } from '../../../shared/ui/LoadingPanel'
import { ErrorBanner } from '../../../shared/ui/ErrorBanner'
import { EmptyState } from '../../../shared/ui/EmptyState'
import { isApiError } from '../../../shared/api/errors'
import { suggestIndicators } from '../api'
import type { Field9Action, Field9State } from '../state/reducer'

interface Props {
  state: Field9State
  dispatch: Dispatch<Field9Action>
}

export function Step2Indicators({ state, dispatch }: Props) {
  async function fetchSuggestions() {
    if (!state.sector || !state.year || !state.lawTitle) return
    dispatch({ type: 'SUGGEST_LOADING' })
    try {
      const result = await suggestIndicators({
        sector: state.sector,
        year: state.year,
        law_title: state.lawTitle,
      })
      dispatch({ type: 'SUGGEST_SUCCESS', payload: result })
    } catch (e) {
      const msg = isApiError(e) ? e.userMessage() : 'Άγνωστο σφάλμα'
      dispatch({ type: 'SUGGEST_ERROR', error: msg })
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (state.suggestStatus === 'idle') fetchSuggestions() }, [])

  const canContinue = state.suggestStatus === 'ready' && state.selectedDatasetIds.size > 0

  return (
    <StepContainer
      onBack={() => dispatch({ type: 'GO_TO_STEP', step: 1 })}
      onNext={() => dispatch({ type: 'GO_TO_STEP', step: 3 })}
      nextDisabled={!canContinue}
      isLoading={state.suggestStatus === 'loading'}
    >
      <StepHeader title="Επιλογή Δεικτών" stepNumber={2} totalSteps={3} />

      {state.suggestStatus === 'loading' && <LoadingPanel message="Ανάκτηση προτεινόμενων δεικτών…" />}
      {state.suggestError && <ErrorBanner message={state.suggestError} onRetry={fetchSuggestions} />}

      {state.suggestStatus === 'ready' && (
        <>
          {state.suggestions.length === 0 ? (
            <EmptyState message="Δεν βρέθηκαν προτεινόμενοι δείκτες." />
          ) : (
            <ul className="checkbox-list">
              {state.suggestions.map((s) => (
                <li key={s.dataset_id} className="checkbox-list__item indicator-card">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={state.selectedDatasetIds.has(s.dataset_id)}
                      onChange={() => dispatch({ type: 'TOGGLE_INDICATOR', datasetId: s.dataset_id })}
                    />
                    <div className="indicator-card__body">
                      <span className="indicator-card__name">{s.indicator_name}</span>
                      <span className="indicator-card__id">({s.dataset_id})</span>
                      <p className="indicator-card__desc">{s.description}</p>
                      <p className="indicator-card__reason">
                        <em>Σχετικότητα:</em> {s.relevance_reason}
                      </p>
                    </div>
                  </label>
                </li>
              ))}
            </ul>
          )}
          {state.suggestions.length > 0 && state.selectedDatasetIds.size === 0 && (
            <p className="hint-text" role="alert">Επιλέξτε τουλάχιστον έναν δείκτη.</p>
          )}
        </>
      )}
    </StepContainer>
  )
}
