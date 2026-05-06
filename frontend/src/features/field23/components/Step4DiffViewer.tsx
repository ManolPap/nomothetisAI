import { type Dispatch, useEffect, useRef, useState } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { StepHeader } from '../../../shared/ui/StepHeader'
import { StepContainer } from '../../../shared/ui/StepContainer'
import { ErrorBoundary } from '../../../shared/ui/ErrorBoundary'
import { isApiError } from '../../../shared/api/errors'
import { attributeComments } from '../api'
import { ALL_CHANGE_TYPES, type Field23Action, type Field23State } from '../state/reducer'
import type { ArticleDiffOut, ChangeType, DiffSegmentOut } from '../types'
import { AttributionPanel } from './AttributionPanel'

interface Props {
  state: Field23State
  dispatch: Dispatch<Field23Action>
}

const CHANGE_TYPE_LABELS: Record<ChangeType, string> = {
  added: 'Προσθήκη',
  removed: 'Αφαίρεση',
  modified: 'Τροποποίηση',
  unchanged: 'Αμετάβλητο',
}

export function Step4DiffViewer({ state, dispatch }: Props) {
  const [attributionOpen, setAttributionOpen] = useState(false)
  const attributionAbortRef = useRef<AbortController | null>(null)

  const filteredDiffs = state.diffs.filter((d) => {
    if (!state.filterChangeTypes.has(d.change_type)) return false
    const query = state.filterArticleQuery.toLowerCase()
    if (query) {
      const num = d.old_article?.article_number ?? d.new_article?.article_number ?? ''
      const title = d.old_article?.title ?? d.new_article?.title ?? ''
      if (!num.toLowerCase().includes(query) && !title.toLowerCase().includes(query)) return false
    }
    return true
  })

  const VIRTUALIZE = filteredDiffs.length > 100
  const parentRef = useRef<HTMLDivElement>(null)
  const virtualizer = useVirtualizer({
    count: filteredDiffs.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 120,
    overscan: 5,
  })

  async function runAttribution(diffIndex: number) {
    const diff = state.diffs[diffIndex]
    if (!diff) return

    dispatch({ type: 'SELECT_DIFF', index: diffIndex })
    dispatch({ type: 'ATTRIBUTION_LOADING' })
    setAttributionOpen(true)

    const controller = new AbortController()
    attributionAbortRef.current = controller

    const startedAt = Date.now()

    try {
      const res = await attributeComments(
        {
          items: [
            {
              item_index: diffIndex,
              initial_article: diff.old_article,
              final_article: diff.new_article,
              legislative_comments: [],
            },
          ],
        },
        controller.signal,
      )
      const duration = Date.now() - startedAt
      if (import.meta.env.DEV && duration > 12_000) {
        console.warn(`[Attribution] slow request: ${duration}ms`)
      }
      dispatch({ type: 'ATTRIBUTION_SUCCESS', results: res.items })
    } catch (e) {
      if ((e as Error).name === 'AbortError') return
      dispatch({ type: 'ATTRIBUTION_ERROR', error: isApiError(e) ? e.userMessage() : 'Σφάλμα' })
    }
  }

  function closeAttribution() {
    attributionAbortRef.current?.abort()
    attributionAbortRef.current = null
    setAttributionOpen(false)
    dispatch({ type: 'SELECT_DIFF', index: null })
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => { attributionAbortRef.current?.abort() }
  }, [])

  const selectedDiff =
    state.selectedDiffIndex != null ? state.diffs[state.selectedDiffIndex] : null

  return (
    <>
      <StepContainer onBack={() => dispatch({ type: 'GO_TO_STEP', step: 3 })}>
        <StepHeader
          title="Προβολή Διαφορών"
          stepNumber={4}
          totalSteps={4}
          description={`${filteredDiffs.length} αλλαγές εμφανίζονται`}
        />

        {/* Filters row */}
        <div className="compare-filters">
          {ALL_CHANGE_TYPES.map((ct) => (
            <label key={ct} className="checkbox-label">
              <input
                type="checkbox"
                checked={state.filterChangeTypes.has(ct)}
                onChange={() => dispatch({ type: 'TOGGLE_FILTER_CHANGE_TYPE', changeType: ct })}
              />
              {CHANGE_TYPE_LABELS[ct]}
            </label>
          ))}
          <input
            type="text"
            className="filter-input"
            placeholder="Αριθμός / τίτλος άρθρου"
            value={state.filterArticleQuery}
            onChange={(e) => dispatch({ type: 'SET_FILTER_QUERY', query: e.target.value })}
            aria-label="Φίλτρο άρθρου"
          />
        </div>

        {VIRTUALIZE ? (
          <div ref={parentRef} className="diff-list diff-list--virtual" style={{ height: '600px', overflow: 'auto' }}>
            <div style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}>
              {virtualizer.getVirtualItems().map((vItem) => {
                const diff = filteredDiffs[vItem.index]
                return (
                  <div
                    key={vItem.key}
                    style={{ position: 'absolute', top: vItem.start, width: '100%' }}
                    ref={virtualizer.measureElement}
                    data-index={vItem.index}
                  >
                    <DiffRow diff={diff} index={vItem.index} onAttribute={runAttribution} />
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          <div className="diff-list">
            {filteredDiffs.map((diff, i) => (
              <DiffRow key={i} diff={diff} index={i} onAttribute={runAttribution} />
            ))}
          </div>
        )}
      </StepContainer>

      {attributionOpen && selectedDiff && (
        <ErrorBoundary fallbackTitle="Σφάλμα στην Απόδοση">
          <AttributionPanel
            diff={selectedDiff}
            diffIndex={state.selectedDiffIndex!}
            state={state}
            onClose={closeAttribution}
          />
        </ErrorBoundary>
      )}
    </>
  )
}

function DiffRow({
  diff,
  index,
  onAttribute,
}: {
  diff: ArticleDiffOut
  index: number
  onAttribute: (i: number) => void
}) {
  const [expanded, setExpanded] = useState(diff.segments.length <= 300)
  const articleLabel =
    diff.old_article?.article_number ?? diff.new_article?.article_number ?? `#${index + 1}`
  const articleTitle = diff.old_article?.title ?? diff.new_article?.title ?? ''

  return (
    <div className={`diff-row diff-row--${diff.change_type}`}>
      <div className="diff-row__header">
        <span className={`change-badge change-badge--${diff.change_type}`}>
          {diff.change_type.toUpperCase()}
        </span>
        <strong>Άρθρο {articleLabel}</strong>
        {articleTitle && <span className="diff-row__title">{articleTitle}</span>}
        <span className="diff-row__score">
          Ομοιότητα: {Math.round(diff.similarity_score * 100)}%
        </span>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => onAttribute(index)}
        >
          Απόδοση σχολίων
        </button>
        {diff.segments.length > 300 && (
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setExpanded((x) => !x)}
          >
            {expanded ? 'Σύμπτυξη' : 'Ανάπτυξη'}
          </button>
        )}
      </div>
      {expanded && (
        <div className="diff-segments">
          {diff.segments.map((seg, si) => (
            <SegmentSpan key={si} seg={seg} />
          ))}
        </div>
      )}
    </div>
  )
}

function SegmentSpan({ seg }: { seg: DiffSegmentOut }) {
  if (seg.operation === 'equal') {
    return <span className="seg seg--equal">{seg.text}</span>
  }
  if (seg.operation === 'delete') {
    return (
      <del className="seg seg--delete" aria-label="Αφαιρέθηκε">
        {seg.text}
      </del>
    )
  }
  return (
    <ins className="seg seg--insert" aria-label="Προστέθηκε">
      {seg.text}
    </ins>
  )
}
