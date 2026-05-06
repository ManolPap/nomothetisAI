import { useReducer } from 'react'
import { ErrorBoundary } from '../../../shared/ui/ErrorBoundary'
import { field9Reducer, initialField9State } from '../state/reducer'
import { Step1Sector } from '../components/Step1Sector'
import { Step2Indicators } from '../components/Step2Indicators'
import { Step3DataTable } from '../components/Step3DataTable'

export function Field9Page() {
  const [state, dispatch] = useReducer(field9Reducer, initialField9State)

  return (
    <ErrorBoundary fallbackTitle="Σφάλμα στο Πεδίο 9">
      <div className="feature-page">
        <h1 className="feature-page__title">Πεδίο 9 — Δείκτες Eurostat</h1>
        {state.currentStep === 1 && <Step1Sector state={state} dispatch={dispatch} />}
        {state.currentStep === 2 && <Step2Indicators state={state} dispatch={dispatch} />}
        {state.currentStep === 3 && <Step3DataTable state={state} dispatch={dispatch} />}
      </div>
    </ErrorBoundary>
  )
}
