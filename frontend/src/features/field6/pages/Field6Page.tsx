import { useEffect, useReducer } from 'react'
import { ErrorBoundary } from '../../../shared/ui/ErrorBoundary'
import { field6Reducer, initialField6State } from '../state/reducer'
import { field6PersistEventName, loadField6Persisted, saveField6Persisted } from '../state/persist'
import { Step1Upload } from '../components/Step1Upload'
import { Step2WebFacts } from '../components/Step2WebFacts'
import { Step3Eurostat } from '../components/Step3Eurostat'
import { Step4Synthesis } from '../components/Step4Synthesis'

export function Field6Page() {
  const [state, dispatch] = useReducer(
    field6Reducer,
    initialField6State,
    (base) => loadField6Persisted() ?? base,
  )

  useEffect(() => {
    saveField6Persisted(state)
  }, [state])

  useEffect(() => {
    const sync = () => {
      if (!loadField6Persisted()) dispatch({ type: 'RESET_FIELD6_WORKFLOW' })
    }
    const ev = field6PersistEventName()
    window.addEventListener(ev, sync)
    return () => window.removeEventListener(ev, sync)
  }, [dispatch])

  return (
    <ErrorBoundary fallbackTitle="Σφάλμα στο Πεδίο 6">
      <div className="feature-page page-shell">
        <h1 className="feature-page__title">Πεδίο 6 - Συναφείς Πρακτικές</h1>
        {state.currentStep === 1 && <Step1Upload state={state} dispatch={dispatch} />}
        {state.currentStep === 2 && <Step2WebFacts state={state} dispatch={dispatch} />}
        {state.currentStep === 3 && <Step3Eurostat state={state} dispatch={dispatch} />}
        {state.currentStep === 4 && <Step4Synthesis state={state} dispatch={dispatch} />}
      </div>
    </ErrorBoundary>
  )
}
