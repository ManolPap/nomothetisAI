import type { ReactNode } from 'react'

interface StepContainerProps {
  children: ReactNode
  onBack?: () => void
  onNext?: () => void
  nextLabel?: string
  nextDisabled?: boolean
  isLoading?: boolean
}

export function StepContainer({
  children,
  onBack,
  onNext,
  nextLabel = 'Επόμενο',
  nextDisabled = false,
  isLoading = false,
}: StepContainerProps) {
  const nextActionDisabled = nextDisabled || isLoading

  return (
    <div className="step-container" aria-busy={isLoading}>
      <div className="step-content">{children}</div>
      <div className="step-actions">
        {onBack && (
          <button type="button" className="btn btn-secondary" onClick={onBack} disabled={isLoading}>
            ← Πίσω
          </button>
        )}
        {onNext && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={onNext}
            disabled={nextActionDisabled}
            aria-disabled={nextActionDisabled}
          >
            {isLoading ? <span className="spinner" aria-hidden="true" /> : null}
            {isLoading ? 'Επεξεργασία…' : nextLabel}
          </button>
        )}
      </div>
    </div>
  )
}
