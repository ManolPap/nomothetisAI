import { useReducer } from 'react'
import { ErrorBoundary } from '../../../shared/ui/ErrorBoundary'
import { field23Reducer, initialField23State } from '../state/reducer'
import { Step1Input } from '../components/Step1Input'
import { Step2Split } from '../components/Step2Split'
import { Step3Compare } from '../components/Step3Compare'
import { Step4DiffViewer } from '../components/Step4DiffViewer'

export function Field23Page() {
  const [state, dispatch] = useReducer(field23Reducer, initialField23State)

  return (
    <ErrorBoundary fallbackTitle="Σφάλμα στο Πεδίο 23">
      <div className="feature-page page-shell">
        <header className="page-hero">
          <p className="page-hero__eyebrow">Field 23 Workflow</p>
          <p className="page-hero__subtitle">Σύγκριση αρχικού/τελικού νόμου με ασφαλή διάσπαση και προβολή διαφορών.</p>
        </header>
        <h1 className="feature-page__title">Πεδίο 23 — Σύγκριση Νόμων</h1>
        {state.currentStep === 1 && <Step1Input state={state} dispatch={dispatch} />}
        {state.currentStep === 2 && <Step2Split state={state} dispatch={dispatch} />}
        {state.currentStep === 3 && <Step3Compare state={state} dispatch={dispatch} />}
        {state.currentStep === 4 && (
          <ErrorBoundary fallbackTitle="Σφάλμα στο Diff Viewer">
            <Step4DiffViewer state={state} dispatch={dispatch} />
          </ErrorBoundary>
        )}
      </div>
    </ErrorBoundary>
  )
}
