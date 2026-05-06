import { describe, expect, it } from 'vitest'
import { field23Reducer, initialField23State } from '../reducer'
import type { ArticleDiffOut } from '../../types'

const mockFile = new File(['pdf'], 'law.pdf', { type: 'application/pdf' })
const mockArticles = [{ article_number: '1', header: '', title: 'Art 1', body: '' }]

describe('field23Reducer', () => {
  it('resets all downstream when initial file changes', () => {
    const withData = {
      ...initialField23State,
      splitInitialStatus: 'ready' as const,
      initialArticles: mockArticles,
      compareStatus: 'ready' as const,
      diffs: [{} as ArticleDiffOut],
    }
    const next = field23Reducer(withData, { type: 'SET_INITIAL_FILE', file: mockFile })
    expect(next.splitInitialStatus).toBe('idle')
    expect(next.initialArticles).toHaveLength(0)
    expect(next.compareStatus).toBe('idle')
    expect(next.diffs).toHaveLength(0)
  })

  it('resets compare and attribution when normalize changes', () => {
    const withCompare = {
      ...initialField23State,
      compareStatus: 'ready' as const,
      diffs: [{} as ArticleDiffOut],
      attributionStatus: 'ready' as const,
    }
    const next = field23Reducer(withCompare, { type: 'SET_NORMALIZE', value: true })
    expect(next.compareStatus).toBe('idle')
    expect(next.attributionStatus).toBe('idle')
    expect(next.normalizeBefore).toBe(true)
  })

  it('resets attribution when diff selection changes', () => {
    const withAttribution = {
      ...initialField23State,
      attributionStatus: 'ready' as const,
      attributionResults: { 0: { item_index: 0, contributions: [] } },
    }
    const next = field23Reducer(withAttribution, { type: 'SELECT_DIFF', index: 1 })
    expect(next.attributionStatus).toBe('idle')
    expect(next.attributionResults).toEqual({})
    expect(next.selectedDiffIndex).toBe(1)
  })

  it('toggles filter change types', () => {
    const next = field23Reducer(initialField23State, { type: 'TOGGLE_FILTER_CHANGE_TYPE', changeType: 'added' })
    expect(next.filterChangeTypes.has('added')).toBe(false)
    const next2 = field23Reducer(next, { type: 'TOGGLE_FILTER_CHANGE_TYPE', changeType: 'added' })
    expect(next2.filterChangeTypes.has('added')).toBe(true)
  })
})
