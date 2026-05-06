import { useReducer } from 'react'
import { ErrorBoundary } from '../../../shared/ui/ErrorBoundary'
import { field6Reducer, initialField6State } from '../state/reducer'
import { Step1Upload } from '../components/Step1Upload'
import { Step2WebFacts } from '../components/Step2WebFacts'
import { Step3Eurostat } from '../components/Step3Eurostat'
import { Step4Synthesis } from '../components/Step4Synthesis'

export function Field6Page() {
  const [state, dispatch] = useReducer(field6Reducer, initialField6State)

  return (
    <ErrorBoundary fallbackTitle="Σφάλμα στο Πεδίο 6">
      <div className="feature-page">
        <h1 className="feature-page__title">Πεδίο 6 — Ανάλυση Νόμου</h1>
        {state.currentStep === 1 && <Step1Upload state={state} dispatch={dispatch} />}
        {state.currentStep === 2 && <Step2WebFacts state={state} dispatch={dispatch} />}
        {state.currentStep === 3 && <Step3Eurostat state={state} dispatch={dispatch} />}
        {state.currentStep === 4 && <Step4Synthesis state={state} dispatch={dispatch} />}
      </div>
    </ErrorBoundary>
  )
}
