import { type Dispatch, useEffect } from 'react'
import { StepHeader } from '../../../shared/ui/StepHeader'
import { StepContainer } from '../../../shared/ui/StepContainer'
import { LoadingPanel } from '../../../shared/ui/LoadingPanel'
import { ErrorBanner } from '../../../shared/ui/ErrorBanner'
import { EmptyState } from '../../../shared/ui/EmptyState'
import { isApiError } from '../../../shared/api/errors'
import { fetchEurostat } from '../api'
import type { Field6Action, Field6State } from '../state/reducer'

interface Props {
  state: Field6State
  dispatch: Dispatch<Field6Action>
}

export function Step3Eurostat({ state, dispatch }: Props) {
  async function loadEurostat() {
    if (!state.metadata || !state.factsText) return
    dispatch({ type: 'EUROSTAT_LOADING' })
    try {
      const result = await fetchEurostat({ metadata: state.metadata, facts_text: state.factsText })
      dispatch({ type: 'EUROSTAT_SUCCESS', payload: result })
    } catch (e) {
      const msg = isApiError(e) ? e.userMessage() : 'Άγνωστο σφάλμα'
      dispatch({ type: 'EUROSTAT_ERROR', error: msg })
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (state.eurostatStatus === 'idle') loadEurostat() }, [])

  const entries = Object.entries(state.eurostatData)
  const canContinue = state.eurostatStatus === 'ready'

  return (
    <StepContainer
      onBack={() => dispatch({ type: 'GO_TO_STEP', step: 2 })}
      onNext={() => dispatch({ type: 'GO_TO_STEP', step: 4 })}
      nextDisabled={!canContinue}
      isLoading={state.eurostatStatus === 'loading'}
    >
      <StepHeader title="Επιλογή Δεικτών" stepNumber={3} totalSteps={4} />

      {state.eurostatStatus === 'loading' && <LoadingPanel message="Λήψη Eurostat δεδομένων…" />}
      {state.eurostatError && <ErrorBanner message={state.eurostatError} onRetry={loadEurostat} />}

      {state.eurostatStatus === 'ready' && (
        <>
          {entries.length === 0 ? (
            <EmptyState message="Δεν βρέθηκαν Eurostat δεδομένα." />
          ) : (
            <>
              <p className="eurostat-indicator">
                <strong>Δείκτης:</strong> {state.indicatorName}
              </p>
              <ul className="country-list">
                {entries.map(([code, entry]) => (
                  <li key={code} className="country-card">
                    <label className="checkbox-label country-card__header">
                      <input
                        type="checkbox"
                        checked={state.selectedCountryCodes.has(code)}
                        onChange={() => dispatch({ type: 'TOGGLE_COUNTRY', code })}
                      />
                      <strong>{entry.name} ({code})</strong>
                      <span className="country-card__indicator">{entry.indicator}</span>
                    </label>
                    <a
                      href={entry.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="country-card__url"
                    >
                      Eurostat ({entry.dataset_id})
                    </a>
                    {state.selectedCountryCodes.has(code) && (
                      <div className="year-values">
                        {Object.entries(entry.values).map(([year, val]) => (
                          <label key={year} className="year-label">
                            <input
                              type="checkbox"
                              checked={state.selectedYearsByCountry[code]?.has(year) ?? false}
                              onChange={() => dispatch({ type: 'TOGGLE_YEAR', countryCode: code, year })}
                            />
                            {year}: {val}%
                          </label>
                        ))}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </StepContainer>
  )
}
