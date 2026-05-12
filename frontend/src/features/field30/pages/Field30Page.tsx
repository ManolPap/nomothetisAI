import { useEffect, useReducer } from 'react'
import { ErrorBoundary } from '../../../shared/ui/ErrorBoundary'
import { Step1Analyze } from '../components/Step1Analyze'
import { field30Reducer, initialField30State } from '../state/reducer'
import { field30PersistEventName, loadField30Persisted, saveField30Persisted } from '../state/persist'

export function Field30Page() {
  const [state, dispatch] = useReducer(
    field30Reducer,
    initialField30State,
    (base) => loadField30Persisted() ?? base,
  )

  useEffect(() => {
    saveField30Persisted(state)
  }, [state])

  useEffect(() => {
    const sync = () => {
      if (!loadField30Persisted()) dispatch({ type: 'RESET_FIELD30_WORKFLOW' })
    }
    const ev = field30PersistEventName()
    window.addEventListener(ev, sync)
    return () => window.removeEventListener(ev, sync)
  }, [dispatch])

  return (
    <ErrorBoundary fallbackTitle="Σφάλμα στο Πεδίο 30">
      <div className="feature-page">
        <h1 className="feature-page__title">Πεδίο 30 — Πίνακας Καταργούμενων Διατάξεων</h1>
        <Step1Analyze state={state} dispatch={dispatch} />
      </div>
    </ErrorBoundary>
  )
}
