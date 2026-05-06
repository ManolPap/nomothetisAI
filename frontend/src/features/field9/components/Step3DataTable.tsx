import { type Dispatch, useEffect } from 'react'
import { StepHeader } from '../../../shared/ui/StepHeader'
import { StepContainer } from '../../../shared/ui/StepContainer'
import { LoadingPanel } from '../../../shared/ui/LoadingPanel'
import { ErrorBanner } from '../../../shared/ui/ErrorBanner'
import { EmptyState } from '../../../shared/ui/EmptyState'
import { isApiError } from '../../../shared/api/errors'
import { fetchIndicatorData } from '../api'
import type { Field9Action, Field9State } from '../state/reducer'

interface Props {
  state: Field9State
  dispatch: Dispatch<Field9Action>
}

export function Step3DataTable({ state, dispatch }: Props) {
  async function loadData() {
    if (state.selectedDatasetIds.size === 0 || !state.year) return
    dispatch({ type: 'FETCH_LOADING' })
    try {
      const result = await fetchIndicatorData({
        selected_indicators: Array.from(state.selectedDatasetIds),
        year: state.year,
      })
      dispatch({ type: 'FETCH_SUCCESS', payload: result })
    } catch (e) {
      const msg = isApiError(e) ? e.userMessage() : 'Άγνωστο σφάλμα'
      dispatch({ type: 'FETCH_ERROR', error: msg })
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (state.fetchStatus === 'idle') loadData() }, [])

  return (
    <StepContainer
      onBack={() => dispatch({ type: 'GO_TO_STEP', step: 2 })}
      isLoading={state.fetchStatus === 'loading'}
    >
      <StepHeader title="Δεδομένα Δεικτών" stepNumber={3} totalSteps={3} />

      {state.fetchStatus === 'loading' && <LoadingPanel message="Λήψη δεδομένων δεικτών…" />}
      {state.fetchError && <ErrorBanner message={state.fetchError} onRetry={loadData} />}

      {state.fetchStatus === 'ready' && (
        <>
          {state.indicators.length === 0 ? (
            <EmptyState message="Δεν βρέθηκαν δεδομένα δεικτών." />
          ) : (
            <div className="table-wrapper">
              <p className="table-meta">
                Έτος αναφοράς: <strong>{state.referenceYear}</strong> | Εύρος 5ετίας:{' '}
                <strong>{state.fiveYearRange.join(', ')}</strong>
              </p>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Δείκτης</th>
                    <th>Dataset ID</th>
                    {state.fiveYearRange.map((y) => <th key={y}>{y}</th>)}
                    <th>Μονάδα</th>
                    <th>Στόχος 3ετίας</th>
                    <th>Πηγή</th>
                  </tr>
                </thead>
                <tbody>
                  {state.indicators.map((ind) => (
                    <tr key={ind.dataset_id}>
                      <td>{ind.indicator_name}</td>
                      <td>{ind.dataset_id}</td>
                      {state.fiveYearRange.map((y) => {
                        const entry = ind.values.find((v) => v.year === y)
                        return (
                          <td key={y}>
                            {entry == null || entry.value == null ? '—' : entry.value}
                          </td>
                        )
                      })}
                      <td>{ind.unit}</td>
                      <td>
                        <input
                          type="text"
                          className="target-input"
                          value={state.targetValues[ind.dataset_id] ?? ''}
                          onChange={(e) =>
                            dispatch({
                              type: 'SET_TARGET_VALUE',
                              datasetId: ind.dataset_id,
                              value: e.target.value,
                            })
                          }
                          aria-label={`Στόχος 3ετίας για ${ind.indicator_name}`}
                        />
                      </td>
                      <td>
                        {ind.eurostat_url ? (
                          <a
                            href={ind.eurostat_url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Eurostat
                          </a>
                        ) : (
                          '—'
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </StepContainer>
  )
}
