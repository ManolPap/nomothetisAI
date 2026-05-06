export type ApiErrorDetail = string | Record<string, unknown>[] | Record<string, unknown> | null

export class ApiError extends Error {
  readonly status: number
  readonly detail: ApiErrorDetail
  override readonly cause?: unknown

  constructor(status: number, message: string, detail: ApiErrorDetail = null, cause?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.detail = detail
    this.cause = cause
  }

  /** True when FastAPI returned a field-validation array (422 from schema mismatch) */
  isFieldValidation(): boolean {
    return this.status === 422 && Array.isArray(this.detail)
  }

  /** True when backend could not parse the PDF (422 with plain string detail) */
  isPdfParseError(): boolean {
    return this.status === 422 && typeof this.detail === 'string'
  }

  isServiceUnavailable(): boolean {
    return this.status === 503
  }

  isTimeout(): boolean {
    return this.status === 0 && this.message === 'timeout'
  }

  isNetworkError(): boolean {
    return this.status === 0 && this.message !== 'timeout'
  }

  /** Human-readable message suitable for display. Never exposes raw stack traces. */
  userMessage(): string {
    if (this.isTimeout()) return 'Το αίτημα έληξε. Δοκιμάστε ξανά.'
    if (this.isNetworkError()) return 'Αδυναμία σύνδεσης με τον server. Ελέγξτε τη σύνδεσή σας.'
    if (this.status === 400) return typeof this.detail === 'string' ? this.detail : 'Μη έγκυρη είσοδος.'
    if (this.isPdfParseError()) return typeof this.detail === 'string' ? this.detail : 'Αδυναμία ανάγνωσης του PDF.'
    if (this.isFieldValidation()) return 'Σφάλμα επικύρωσης δεδομένων.'
    if (this.isServiceUnavailable()) return 'Η υπηρεσία δεν είναι διαθέσιμη αυτή τη στιγμή.'
    if (this.status >= 500) return 'Εσωτερικό σφάλμα server. Δοκιμάστε ξανά.'
    return this.message
  }
}

export function isApiError(e: unknown): e is ApiError {
  return e instanceof ApiError
}
