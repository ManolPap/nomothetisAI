import { useReducer } from 'react'
import { ErrorBoundary } from '../../../shared/ui/ErrorBoundary'
import { Step1Analyze } from '../components/Step1Analyze'
import { field4Reducer, initialField4State } from '../state/reducer'

export function Field4Page() {
  const [state, dispatch] = useReducer(field4Reducer, initialField4State)

  return (
    <ErrorBoundary fallbackTitle="Σφάλμα στο Πεδίο 4">
      <div className="feature-page">
        <h1 className="feature-page__title">Πεδίο 4 — Νομοθετικές Αναφορές</h1>
        <Step1Analyze state={state} dispatch={dispatch} />
      </div>
    </ErrorBoundary>
  )
}
