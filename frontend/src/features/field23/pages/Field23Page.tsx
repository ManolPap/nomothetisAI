import { useEffect, useReducer } from 'react'
import { ErrorBoundary } from '../../../shared/ui/ErrorBoundary'
import { field23Reducer, initialField23State } from '../state/reducer'
import { field23PersistEventName, loadField23Persisted, saveField23Persisted } from '../state/persist'
import { Step1Input } from '../components/Step1Input'
import { Step2Split } from '../components/Step2Split'
import { Step4DiffViewer } from '../components/Step4DiffViewer'
import { Step5ConsultationReport } from '../components/Step5ConsultationReport'

export function Field23Page() {
  const [state, dispatch] = useReducer(
    field23Reducer,
    initialField23State,
    (base) => loadField23Persisted() ?? base,
  )

  useEffect(() => {
    saveField23Persisted(state)
  }, [state])

  useEffect(() => {
    const sync = () => {
      if (!loadField23Persisted()) dispatch({ type: 'RESET_FIELD23_WORKFLOW' })
    }
    const ev = field23PersistEventName()
    window.addEventListener(ev, sync)
    return () => window.removeEventListener(ev, sync)
  }, [dispatch])

  return (
    <ErrorBoundary fallbackTitle="Σφάλμα στο Πεδίο 23">
      <div className="feature-page page-shell">
        <header className="page-hero">
          <p className="page-hero__eyebrow">Field 23 Workflow</p>
          <p className="page-hero__subtitle">Σχόλια στο πλαίσιο της διαβούλευσης μέσω της ηλεκτρονικής πλατφόρμας
          www.opengov.gr (ηλεκτρονική επισύναψη της έκθεσης).</p>
        </header>
        <h1 className="feature-page__title">Πεδίο 23</h1>
        {state.currentStep === 1 && <Step1Input state={state} dispatch={dispatch} />}
        {state.currentStep === 2 && <Step2Split state={state} dispatch={dispatch} />}
        {state.currentStep === 3 && (
          <ErrorBoundary fallbackTitle="Σφάλμα στο Diff Viewer">
            <Step4DiffViewer state={state} dispatch={dispatch} />
          </ErrorBoundary>
        )}
        {state.currentStep === 4 && (
          <ErrorBoundary fallbackTitle="Σφάλμα στην Έκθεση Διαβούλευσης">
            <Step5ConsultationReport state={state} dispatch={dispatch} />
          </ErrorBoundary>
        )}
      </div>
    </ErrorBoundary>
  )
}
