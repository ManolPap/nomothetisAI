import { useReducer } from 'react'
import { ErrorBoundary } from '../../../shared/ui/ErrorBoundary'
import { Step1Analyze } from '../components/Step1Analyze'
import { field30Reducer, initialField30State } from '../state/reducer'

export function Field30Page() {
  const [state, dispatch] = useReducer(field30Reducer, initialField30State)

  return (
    <ErrorBoundary fallbackTitle="Σφάλμα στο Πεδίο 30">
      <div className="feature-page">
        <h1 className="feature-page__title">Πεδίο 30 — Πίνακας Καταργούμενων Διατάξεων</h1>
        <Step1Analyze state={state} dispatch={dispatch} />
      </div>
    </ErrorBoundary>
  )
}
