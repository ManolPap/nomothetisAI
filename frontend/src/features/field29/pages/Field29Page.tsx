import { useEffect, useReducer } from 'react'
import { ErrorBoundary } from '../../../shared/ui/ErrorBoundary'
import { Step1Analyze } from '../components/Step1Analyze'
import { field29Reducer, initialField29State } from '../state/reducer'
import { field29PersistEventName, loadField29Persisted, saveField29Persisted } from '../state/persist'

export function Field29Page() {
  const [state, dispatch] = useReducer(
    field29Reducer,
    initialField29State,
    (base) => loadField29Persisted() ?? base,
  )

  useEffect(() => {
    saveField29Persisted(state)
  }, [state])

  useEffect(() => {
    const sync = () => {
      if (!loadField29Persisted()) dispatch({ type: 'RESET_FIELD29_WORKFLOW' })
    }
    const ev = field29PersistEventName()
    window.addEventListener(ev, sync)
    return () => window.removeEventListener(ev, sync)
  }, [dispatch])

  return (
    <ErrorBoundary fallbackTitle="Σφάλμα στο Πεδίο 29">
      <div className="feature-page">
        <h1 className="feature-page__title">Πεδίο 29 — Πίνακας Τροποποιούμενων Διατάξεων</h1>
        <Step1Analyze state={state} dispatch={dispatch} />
      </div>
    </ErrorBoundary>
  )
}
