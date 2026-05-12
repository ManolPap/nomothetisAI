import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

interface StepContainerProps {
  children: ReactNode
  onBack?: () => void
  onNext?: () => void
  nextLabel?: string
  nextClassName?: string
  nextDisabled?: boolean
  isLoading?: boolean
  /** Εμφανίζει σύνδεσμο «Συνέχεια» δεξιά που οδηγεί στην αρχική. */
  showContinueHome?: boolean
}

export function StepContainer({
  children,
  onBack,
  onNext,
  nextLabel = 'Επόμενο',
  nextClassName = 'btn-primary',
  nextDisabled = false,
  isLoading = false,
  showContinueHome = false,
}: StepContainerProps) {
  const nextActionDisabled = nextDisabled || isLoading

  return (
    <div className="step-container" aria-busy={isLoading}>
      <div className="step-content">{children}</div>
      <div className="step-actions">
        <div className="step-actions__leading">
          {onBack && (
            <button type="button" className="btn btn-secondary" onClick={onBack} disabled={isLoading}>
              ← Πίσω
            </button>
          )}
        </div>
        <div className="step-actions__trailing">
          {onNext && (
            <button
              type="button"
              className={`btn ${nextClassName}`}
              onClick={onNext}
              disabled={nextActionDisabled}
              aria-disabled={nextActionDisabled}
            >
              {isLoading ? <span className="spinner" aria-hidden="true" /> : null}
              {isLoading ? 'Επεξεργασία…' : nextLabel}
            </button>
          )}
          {showContinueHome && (
            <Link className="btn btn-ghost" to="/">
              Συνέχεια
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
