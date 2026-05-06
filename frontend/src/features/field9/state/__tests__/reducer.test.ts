import { describe, expect, it } from 'vitest'
import { field9Reducer, initialField9State } from '../reducer'

const mockFile = new File(['pdf'], 'law.pdf', { type: 'application/pdf' })

describe('field9Reducer', () => {
  it('resets everything on new file', () => {
    const withData = {
      ...initialField9State,
      extractStatus: 'ready' as const,
      sector: 'Energy',
      suggestStatus: 'ready' as const,
      suggestions: [{ dataset_id: 'abc', indicator_name: 'X', description: '', sector: '', relevance_reason: '' }],
    }
    const next = field9Reducer(withData, { type: 'SET_FILE', file: mockFile })
    expect(next.extractStatus).toBe('idle')
    expect(next.sector).toBe('')
    expect(next.suggestStatus).toBe('idle')
    expect(next.suggestions).toHaveLength(0)
  })

  it('invalidates suggestions when sector changes', () => {
    const withSuggestions = {
      ...initialField9State,
      extractStatus: 'ready' as const,
      suggestStatus: 'ready' as const,
      suggestions: [{ dataset_id: 'abc', indicator_name: 'X', description: '', sector: '', relevance_reason: '' }],
      fetchStatus: 'ready' as const,
    }
    const next = field9Reducer(withSuggestions, { type: 'UPDATE_SECTOR', sector: 'New sector' })
    expect(next.suggestStatus).toBe('idle')
    expect(next.fetchStatus).toBe('idle')
  })

  it('toggles indicator selection', () => {
    const next = field9Reducer(initialField9State, { type: 'TOGGLE_INDICATOR', datasetId: 'lfsa_urgan' })
    expect(next.selectedDatasetIds.has('lfsa_urgan')).toBe(true)
    const next2 = field9Reducer(next, { type: 'TOGGLE_INDICATOR', datasetId: 'lfsa_urgan' })
    expect(next2.selectedDatasetIds.has('lfsa_urgan')).toBe(false)
  })

  it('invalidates fetch when indicator selection changes', () => {
    const withFetch = { ...initialField9State, fetchStatus: 'ready' as const }
    const next = field9Reducer(withFetch, { type: 'TOGGLE_INDICATOR', datasetId: 'lfsa_urgan' })
    expect(next.fetchStatus).toBe('idle')
  })
})
