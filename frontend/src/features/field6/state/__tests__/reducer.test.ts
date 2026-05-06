import { describe, expect, it } from 'vitest'
import type { LawMetadata } from '../../types'
import { field6Reducer, initialField6State } from '../reducer'

const mockMetadata: LawMetadata = {
  topic: 'Δοκιμή',
  ministry: '',
  sector: '',
  measures: '',
  directive: '',
}
const mockFile = new File(['pdf'], 'test.pdf', { type: 'application/pdf' })

describe('field6Reducer', () => {
  it('resets everything when new file is set', () => {
    const stateWithData = {
      ...initialField6State,
      metadataStatus: 'ready' as const,
      metadata: mockMetadata,
      webStatus: 'ready' as const,
      factsText: 'some facts',
    }
    const next = field6Reducer(stateWithData, { type: 'SET_FILE', file: mockFile })
    expect(next.metadataStatus).toBe('idle')
    expect(next.metadata).toBeNull()
    expect(next.webStatus).toBe('idle')
    expect(next.factsText).toBe('')
    expect(next.synthesisStatus).toBe('idle')
  })

  it('invalidates downstream when metadata is updated', () => {
    const stateWithAll = {
      ...initialField6State,
      metadataStatus: 'ready' as const,
      metadata: mockMetadata,
      webStatus: 'ready' as const,
      factsText: 'facts',
      eurostatStatus: 'ready' as const,
      eurostatData: { GR: { name: 'Greece', values: {}, indicator: '', dataset_id: '', url: '' } },
      synthesisStatus: 'ready' as const,
      synthesisText: 'output',
    }
    const next = field6Reducer(stateWithAll, {
      type: 'UPDATE_METADATA',
      metadata: { ...mockMetadata, topic: 'Ενημερωμένο' },
    })
    expect(next.webStatus).toBe('idle')
    expect(next.eurostatStatus).toBe('idle')
    expect(next.synthesisStatus).toBe('idle')
  })

  it('only invalidates synthesis on source toggle', () => {
    const stateWithEurostat = {
      ...initialField6State,
      webStatus: 'ready' as const,
      eurostatStatus: 'ready' as const,
      synthesisStatus: 'ready' as const,
      synthesisText: 'some output',
    }
    const next = field6Reducer(stateWithEurostat, { type: 'TOGGLE_SOURCE', url: 'http://example.com' })
    expect(next.eurostatStatus).toBe('ready')
    expect(next.synthesisStatus).toBe('idle')
    expect(next.selectedSourceUrls.has('http://example.com')).toBe(true)
  })

  it('toggles off a source that was already selected', () => {
    const s = { ...initialField6State, selectedSourceUrls: new Set(['http://a.com']) }
    const next = field6Reducer(s, { type: 'TOGGLE_SOURCE', url: 'http://a.com' })
    expect(next.selectedSourceUrls.has('http://a.com')).toBe(false)
  })

  it('sets synthesis text and recomputes word count', () => {
    const next = field6Reducer(initialField6State, { type: 'SET_SYNTHESIS_TEXT', text: 'one two three' })
    expect(next.synthesisText).toBe('one two three')
    expect(next.wordCount).toBe(3)
  })
})
