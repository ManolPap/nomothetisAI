import { useEffect, useReducer } from 'react'
import { ErrorBoundary } from '../../../shared/ui/ErrorBoundary'
import { field9Reducer, initialField9State } from '../state/reducer'
import { field9PersistEventName, loadField9Persisted, saveField9Persisted } from '../state/persist'
import { Step1Sector } from '../components/Step1Sector'
import { Step2Indicators } from '../components/Step2Indicators'
import { Step3DataTable } from '../components/Step3DataTable'

export function Field9Page() {
  const [state, dispatch] = useReducer(
    field9Reducer,
    initialField9State,
    (base) => loadField9Persisted() ?? base,
  )

  useEffect(() => {
    saveField9Persisted(state)
  }, [state])

  useEffect(() => {
    const sync = () => {
      if (!loadField9Persisted()) dispatch({ type: 'RESET_FIELD9_WORKFLOW' })
    }
    const ev = field9PersistEventName()
    window.addEventListener(ev, sync)
    return () => window.removeEventListener(ev, sync)
  }, [dispatch])

  return (
    <ErrorBoundary fallbackTitle="Σφάλμα στο Πεδίο 9">
      <div className="feature-page page-shell">
        <h1 className="feature-page__title">Πεδίο9-Ειδικότεροι Στόχοι/Δείκτες</h1>
        {state.currentStep === 1 && <Step1Sector state={state} dispatch={dispatch} />}
        {state.currentStep === 2 && <Step2Indicators state={state} dispatch={dispatch} />}
        {state.currentStep === 3 && <Step3DataTable state={state} dispatch={dispatch} />}
      </div>
    </ErrorBoundary>
  )
}
