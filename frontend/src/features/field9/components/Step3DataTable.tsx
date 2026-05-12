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
      showContinueHome
    >
      <StepHeader title="Δεδομένα Δεικτών" stepNumber={3} totalSteps={3} />

      {state.fetchStatus === 'loading' && <LoadingPanel message="Λήψη δεδομένων δεικτών…" />}
      {state.fetchError && <ErrorBanner message={state.fetchError} onRetry={loadData} />}

      {state.fetchStatus === 'ready' && (() => {
        const returnedIds = new Set(state.indicators.map((ind) => ind.dataset_id))
        const missingRows = Array.from(state.selectedDatasetIds)
          .filter((id) => !returnedIds.has(id))
          .map((id) => ({
            dataset_id: id,
            indicator_name: state.suggestions.find((s) => s.dataset_id === id)?.indicator_name ?? id,
          }))
        const hasAnyRows = state.indicators.length > 0 || missingRows.length > 0

        if (!hasAnyRows) {
          return <EmptyState message="Δεν βρέθηκαν δεδομένα Eurostat για την Ελλάδα." />
        }

        return (
          <div className="table-wrapper">
            <p className="table-meta">
              Έτος αναφοράς: <strong>{state.referenceYear}</strong> | Εύρος 5ετίας:{' '}
              <strong>{state.fiveYearRange.join(', ')}</strong>
            </p>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Δείκτης</th>
                  {state.fiveYearRange.map((y) => <th key={y}>{y}</th>)}
                  <th>Πρόσφατα</th>
                  <th>Στόχος 3ετίας</th>
                  <th>Πηγή</th>
                </tr>
              </thead>
              <tbody>
                {state.indicators.map((ind) => (
                  <tr key={ind.dataset_id}>
                    <td>{ind.indicator_name}</td>
                    {state.fiveYearRange.map((y) => {
                      const entry = ind.values.find((v) => v.year === y)
                      return (
                        <td key={y}>
                          {entry == null || entry.value == null ? '—' : `${entry.value}%`}
                        </td>
                      )
                    })}
                    <td>
                      {(() => {
                        const entry = ind.values.find((v) => v.year === state.referenceYear)
                        return entry == null || entry.value == null ? '—' : `${entry.value}%`
                      })()}
                    </td>
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
                        <a href={ind.eurostat_url} target="_blank" rel="noopener noreferrer">
                          Eurostat
                        </a>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                ))}
                {missingRows.map((row) => (
                  <tr key={row.dataset_id}>
                    <td>
                      <div>{row.indicator_name}</div>
                      <div className="no-data-warning">Δεν βρέθηκαν δεδομένα για την Ελλάδα</div>
                    </td>
                    {state.fiveYearRange.map((y) => <td key={y}>—</td>)}
                    <td>—</td>
                    <td></td>
                    <td></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      })()}

      <div className="field9-step3-complete">
        {state.flowCompleted && (
          <p className="field9-step3-complete__done" role="status">
            Η ροή σημειώθηκε ως ολοκληρωμένη στην αρχική.
          </p>
        )}
        {!state.flowCompleted && state.fetchStatus === 'ready' && (
          <button
            type="button"
            className="btn btn-field9-complete"
            onClick={() => dispatch({ type: 'MARK_FLOW_COMPLETED' })}
          >
            Ολοκληρώθηκε
          </button>
        )}
      </div>
    </StepContainer>
  )
}
