import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallbackTitle?: string
  onReset?: () => void
}

interface State {
  hasError: boolean
  errorMessage: string
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, errorMessage: '' }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMessage: error.message }
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error('[ErrorBoundary]', error, info)
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, errorMessage: '' })
    this.props.onReset?.()
  }

  override render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary" role="alert">
          <h3>{this.props.fallbackTitle ?? 'Κάτι πήγε στραβά'}</h3>
          <p>Παρουσιάστηκε σφάλμα. Δοκιμάστε να φορτώσετε ξανά αυτή την ενότητα.</p>
          <button type="button" className="btn btn-secondary" onClick={this.handleReset}>
            Επαναφόρτωση
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
