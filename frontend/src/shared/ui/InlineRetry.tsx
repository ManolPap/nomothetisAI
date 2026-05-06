interface InlineRetryProps {
  message: string
  onRetry: () => void
}

export function InlineRetry({ message, onRetry }: InlineRetryProps) {
  return (
    <span className="inline-retry" role="alert">
      {message}{' '}
      <button type="button" className="inline-retry__btn" onClick={onRetry}>
        Επανάληψη
      </button>
    </span>
  )
}
