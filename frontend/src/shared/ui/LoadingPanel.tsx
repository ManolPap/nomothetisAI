interface LoadingPanelProps {
  message?: string
}

export function LoadingPanel({ message = 'Φόρτωση…' }: LoadingPanelProps) {
  return (
    <div className="loading-panel" aria-busy="true" aria-live="polite">
      <span className="spinner" aria-hidden="true" />
      <p>{message}</p>
    </div>
  )
}
