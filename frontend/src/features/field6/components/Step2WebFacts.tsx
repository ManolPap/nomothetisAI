import { type Dispatch, useEffect } from 'react'
import { StepHeader } from '../../../shared/ui/StepHeader'
import { StepContainer } from '../../../shared/ui/StepContainer'
import { LoadingPanel } from '../../../shared/ui/LoadingPanel'
import { ErrorBanner } from '../../../shared/ui/ErrorBanner'
import { EmptyState } from '../../../shared/ui/EmptyState'
import { isApiError } from '../../../shared/api/errors'
import { webSearch } from '../api'
import { parseFactsText } from '../utils'
import type { Field6Action, Field6State } from '../state/reducer'

interface Props {
  state: Field6State
  dispatch: Dispatch<Field6Action>
}

export function Step2WebFacts({ state, dispatch }: Props) {
  async function fetchFacts() {
    if (!state.metadata || !state.nimText) return
    dispatch({ type: 'WEB_LOADING' })
    try {
      const result = await webSearch({ metadata: state.metadata, nim_text: state.nimText })
      dispatch({ type: 'WEB_SUCCESS', payload: result })
    } catch (e) {
      const msg = isApiError(e) ? e.userMessage() : 'Άγνωστο σφάλμα'
      dispatch({ type: 'WEB_ERROR', error: msg })
    }
  }

  // Auto-fetch on mount if not yet done
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (state.webStatus === 'idle') fetchFacts() }, [])

  const parsedFacts = state.factsText ? parseFactsText(state.factsText) : null
  const canContinue = state.webStatus === 'ready' && state.selectedSourceUrls.size > 0

  return (
    <StepContainer
      onBack={() => dispatch({ type: 'GO_TO_STEP', step: 1 })}
      onNext={() => dispatch({ type: 'GO_TO_STEP', step: 3 })}
      nextDisabled={!canContinue}
      isLoading={state.webStatus === 'loading'}
    >
      <StepHeader title="Επιλογή Web Facts & Πηγών" stepNumber={2} totalSteps={4} />

      {state.webStatus === 'loading' && <LoadingPanel message="Αναζήτηση web facts…" />}
      {state.webError && <ErrorBanner message={state.webError} onRetry={fetchFacts} />}

      {state.webStatus === 'ready' && (
        <>
          <section className="facts-section">
            <h3>Facts</h3>
            {parsedFacts && parsedFacts.length > 0 ? (
              <ul className="checkbox-list">
                {parsedFacts.map((fact, i) => (
                  <li key={i} className="checkbox-list__item">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={state.selectedFactIndices.has(i)}
                        onChange={() => dispatch({ type: 'TOGGLE_FACT', index: i })}
                      />
                      <span>{fact}</span>
                    </label>
                  </li>
                ))}
              </ul>
            ) : (
              <div>
                <p className="facts-raw-label">Ακατέργαστο κείμενο facts (επιλέξτε τα επιθυμητά τμήματα):</p>
                {state.factsText ? (
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={state.selectedFactIndices.has(0)}
                      onChange={() => dispatch({ type: 'TOGGLE_FACT', index: 0 })}
                    />
                    <pre className="facts-raw">{state.factsText}</pre>
                  </label>
                ) : (
                  <EmptyState message="Δεν επιστράφηκαν facts." />
                )}
              </div>
            )}
          </section>

          <section className="sources-section">
            <h3>Πηγές</h3>
            {state.sources.length > 0 ? (
              <ul className="sources-list">
                {state.sources.map((source) => (
                  <li key={source.url} className="source-card">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={state.selectedSourceUrls.has(source.url)}
                        onChange={() => dispatch({ type: 'TOGGLE_SOURCE', url: source.url })}
                      />
                      <div className="source-card__body">
                        <span className="source-card__title">{source.title ?? source.url}</span>
                        {source.snippet && <p className="source-card__snippet">{source.snippet}</p>}
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="source-card__url"
                        >
                          {source.url}
                        </a>
                      </div>
                    </label>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState message="Δεν βρέθηκαν πηγές." />
            )}
          </section>
        </>
      )}
    </StepContainer>
  )
}
