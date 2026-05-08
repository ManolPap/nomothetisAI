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
      flowCompleted: true,
    }
    const next = field23Reducer(withData, { type: 'SET_INITIAL_FILE', file: mockFile })
    expect(next.splitInitialStatus).toBe('idle')
    expect(next.initialArticles).toHaveLength(0)
    expect(next.compareStatus).toBe('idle')
    expect(next.diffs).toHaveLength(0)
    expect(next.flowCompleted).toBe(false)
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

  it('resets report draft while keeping attribution cache when diff selection changes', () => {
    const withAttributionAndReport = {
      ...initialField23State,
      attributionStatus: 'ready' as const,
      attributionResults: { 0: { item_index: 0, contributions: [] } },
      reportStatus: 'ready' as const,
      reportDraft: {
        totals: { comments_total: 1, adopted_total: 1, not_adopted_total: 0, participants_total: 1 },
        articles_section: [
          {
            article_number: '1',
            article_title: 'Άρθρο 1',
            comment_count: 1,
            adopted_count: 1,
            not_adopted_count: 0,
            adopted_summary: 'generated',
            not_adopted_summary: '',
          },
        ],
        final_preview_text: 'generated preview',
        llm_status: 'ok' as const,
      },
    }
    const next = field23Reducer(withAttributionAndReport, { type: 'SELECT_DIFF', index: 1 })
    expect(next.attributionStatus).toBe('idle')
    expect(next.attributionResults).toEqual(withAttributionAndReport.attributionResults)
    expect(next.reportStatus).toBe('idle')
    expect(next.reportDraft).toEqual(initialField23State.reportDraft)
    expect(next.selectedDiffIndex).toBe(1)
  })

  it('stores backend-generated report draft as source of truth', () => {
    const next = field23Reducer(initialField23State, {
      type: 'REPORT_GENERATION_SUCCESS',
      draft: {
        totals: { comments_total: 3, adopted_total: 2, not_adopted_total: 1, participants_total: 2 },
        articles_section: [
          {
            article_number: '1',
            article_title: 'Άρθρο 1',
            comment_count: 3,
            adopted_count: 2,
            not_adopted_count: 1,
            adopted_summary: 'sum A',
            not_adopted_summary: 'sum B',
          },
        ],
        final_preview_text: 'backend preview',
        llm_status: 'partial',
      },
    })
    expect(next.reportStatus).toBe('ready')
    expect(next.reportDraft.final_preview_text).toBe('backend preview')
    expect(next.reportDraft.articles_section).toHaveLength(1)
  })

  it('toggles filter change types', () => {
    const next = field23Reducer(initialField23State, { type: 'TOGGLE_FILTER_CHANGE_TYPE', changeType: 'added' })
    expect(next.filterChangeTypes.has('added')).toBe(false)
    const next2 = field23Reducer(next, { type: 'TOGGLE_FILTER_CHANGE_TYPE', changeType: 'added' })
    expect(next2.filterChangeTypes.has('added')).toBe(true)
  })
})
