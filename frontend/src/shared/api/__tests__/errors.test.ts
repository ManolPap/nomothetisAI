import { describe, expect, it } from 'vitest'
import { ApiError, isApiError } from '../errors'

describe('ApiError', () => {
  it('identifies field validation (422 + array detail)', () => {
    const e = new ApiError(422, 'Validation error', [{ loc: ['body', 'title'], msg: 'required' }])
    expect(e.isFieldValidation()).toBe(true)
    expect(e.isPdfParseError()).toBe(false)
  })

  it('identifies PDF parse error (422 + string detail)', () => {
    const e = new ApiError(422, 'Could not read PDF', 'Could not read PDF')
    expect(e.isPdfParseError()).toBe(true)
    expect(e.isFieldValidation()).toBe(false)
  })

  it('identifies service unavailable', () => {
    const e = new ApiError(503, 'Service unavailable')
    expect(e.isServiceUnavailable()).toBe(true)
  })

  it('identifies timeout', () => {
    const e = new ApiError(0, 'timeout')
    expect(e.isTimeout()).toBe(true)
    expect(e.isNetworkError()).toBe(false)
  })

  it('identifies network error', () => {
    const e = new ApiError(0, 'network')
    expect(e.isNetworkError()).toBe(true)
    expect(e.isTimeout()).toBe(false)
  })

  it('returns Greek user messages', () => {
    expect(new ApiError(0, 'timeout').userMessage()).toContain('έληξε')
    expect(new ApiError(0, 'network').userMessage()).toContain('σύνδεση')
    expect(new ApiError(422, 'pdf', 'Δεν ήταν δυνατή η ανάγνωση').userMessage()).toContain('Δεν ήταν δυνατή')
    expect(new ApiError(503, 'svc').userMessage()).toContain('διαθέσιμη')
    expect(new ApiError(500, 'err').userMessage()).toContain('server')
  })

  it('isApiError returns true only for ApiError instances', () => {
    expect(isApiError(new ApiError(400, 'bad'))).toBe(true)
    expect(isApiError(new Error('plain'))).toBe(false)
    expect(isApiError(null)).toBe(false)
  })
})
