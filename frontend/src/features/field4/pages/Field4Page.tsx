import { useEffect, useReducer } from 'react'
import { ErrorBoundary } from '../../../shared/ui/ErrorBoundary'
import { Step1Analyze } from '../components/Step1Analyze'
import { field4Reducer, initialField4State } from '../state/reducer'
import { field4PersistEventName, loadField4Persisted, saveField4Persisted } from '../state/persist'

export function Field4Page() {
  const [state, dispatch] = useReducer(
    field4Reducer,
    initialField4State,
    (base) => loadField4Persisted() ?? base,
  )

  useEffect(() => {
    saveField4Persisted(state)
  }, [state])

  useEffect(() => {
    const sync = () => {
      if (!loadField4Persisted()) dispatch({ type: 'RESET_FIELD4_WORKFLOW' })
    }
    const ev = field4PersistEventName()
    window.addEventListener(ev, sync)
    return () => window.removeEventListener(ev, sync)
  }, [dispatch])

  return (
    <ErrorBoundary fallbackTitle="Σφάλμα στο Πεδίο 4">
      <div className="feature-page">
        <h1 className="feature-page__title">Πεδίο 4 — Νομοθετικές Αναφορές</h1>
        <Step1Analyze state={state} dispatch={dispatch} />
      </div>
    </ErrorBoundary>
  )
}
