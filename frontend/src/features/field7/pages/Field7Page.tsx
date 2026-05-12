import { useEffect, useReducer } from 'react'
import { ErrorBoundary } from '../../../shared/ui/ErrorBoundary'
import { field7Reducer, initialField7State } from '../state/reducer'
import { field7PersistEventName, loadField7Persisted, saveField7Persisted } from '../state/persist'
import { Step1Classify } from '../components/Step1Classify'
import { Step2Result } from '../components/Step2Result'

export function Field7Page() {
  const [state, dispatch] = useReducer(
    field7Reducer,
    initialField7State,
    (base) => loadField7Persisted() ?? base,
  )

  useEffect(() => {
    saveField7Persisted(state)
  }, [state])

  useEffect(() => {
    const sync = () => {
      if (!loadField7Persisted()) dispatch({ type: 'RESET_FIELD7_WORKFLOW' })
    }
    const ev = field7PersistEventName()
    window.addEventListener(ev, sync)
    return () => window.removeEventListener(ev, sync)
  }, [dispatch])

  return (
    <ErrorBoundary fallbackTitle="Σφάλμα στο Πεδίο 7">
      <div className="feature-page page-shell">
        <h1 className="feature-page__title">Πεδίο 7 — Συμβατότητα με SDGs</h1>
        {state.currentStep === 1 && <Step1Classify state={state} dispatch={dispatch} />}
        {state.currentStep === 2 && <Step2Result state={state} dispatch={dispatch} />}
      </div>
    </ErrorBoundary>
  )
}
