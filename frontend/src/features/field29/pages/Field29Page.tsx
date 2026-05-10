import { useReducer } from 'react'
import { ErrorBoundary } from '../../../shared/ui/ErrorBoundary'
import { Step1Analyze } from '../components/Step1Analyze'
import { field29Reducer, initialField29State } from '../state/reducer'

export function Field29Page() {
  const [state, dispatch] = useReducer(field29Reducer, initialField29State)

  return (
    <ErrorBoundary fallbackTitle="Σφάλμα στο Πεδίο 29">
      <div className="feature-page">
        <h1 className="feature-page__title">Πεδίο 29 — Πίνακας Τροποποιούμενων Διατάξεων</h1>
        <Step1Analyze state={state} dispatch={dispatch} />
      </div>
    </ErrorBoundary>
  )
}
