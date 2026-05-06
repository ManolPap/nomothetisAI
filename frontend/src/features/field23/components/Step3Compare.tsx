import { type Dispatch, useEffect } from 'react'
import { StepHeader } from '../../../shared/ui/StepHeader'
import { StepContainer } from '../../../shared/ui/StepContainer'
import { LoadingPanel } from '../../../shared/ui/LoadingPanel'
import { ErrorBanner } from '../../../shared/ui/ErrorBanner'
import { EmptyState } from '../../../shared/ui/EmptyState'
import { isApiError } from '../../../shared/api/errors'
import { compareLaws } from '../api'
import { ALL_CHANGE_TYPES, type Field23Action, type Field23State } from '../state/reducer'
import type { ChangeType } from '../types'

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

export function Step3Compare({ state, dispatch }: Props) {
  async function runCompare() {
    if (state.initialArticles.length === 0 || state.finalArticles.length === 0) return
    dispatch({ type: 'COMPARE_LOADING' })
    try {
      const res = await compareLaws({
        initial_law_articles: state.initialArticles,
        final_law_articles: state.finalArticles,
        normalize_before_diff: state.normalizeBefore,
      })
      dispatch({ type: 'COMPARE_SUCCESS', diffs: res.diffs })
    } catch (e) {
      dispatch({ type: 'COMPARE_ERROR', error: isApiError(e) ? e.userMessage() : 'Σφάλμα' })
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (state.compareStatus === 'idle') runCompare() }, [])

  const typeCounts = ALL_CHANGE_TYPES.reduce(
    (acc, ct) => ({ ...acc, [ct]: state.diffs.filter((d) => d.change_type === ct).length }),
    {} as Record<ChangeType, number>,
  )

  const filteredDiffs = state.diffs.filter((d) => {
    if (!state.filterChangeTypes.has(d.change_type)) return false
    if (d.token_change_fraction < state.filterMinFraction) return false
    const query = state.filterArticleQuery.toLowerCase()
    if (query) {
      const num = d.old_article?.article_number ?? d.new_article?.article_number ?? ''
      const title = d.old_article?.title ?? d.new_article?.title ?? ''
      if (!num.toLowerCase().includes(query) && !title.toLowerCase().includes(query)) return false
    }
    return true
  })

  const canContinue = state.compareStatus === 'ready' && state.diffs.length > 0

  return (
    <StepContainer
      onBack={() => dispatch({ type: 'GO_TO_STEP', step: 2 })}
      onNext={() => dispatch({ type: 'GO_TO_STEP', step: 4 })}
      nextDisabled={!canContinue}
      isLoading={state.compareStatus === 'loading'}
    >
      <StepHeader title="Σύγκριση Νόμων" stepNumber={3} totalSteps={4} />

      <div className="compare-controls">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={state.normalizeBefore}
            onChange={(e) => dispatch({ type: 'SET_NORMALIZE', value: e.target.checked })}
          />
          Κανονικοποίηση πριν τη σύγκριση
        </label>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={runCompare}
          disabled={state.compareStatus === 'loading'}
        >
          Σύγκριση
        </button>
      </div>

      {state.compareStatus === 'loading' && <LoadingPanel message="Σύγκριση άρθρων…" />}
      {state.compareError && <ErrorBanner message={state.compareError} onRetry={runCompare} />}

      {state.compareStatus === 'ready' && (
        <>
          {/* Summary */}
          <div className="change-type-summary">
            {ALL_CHANGE_TYPES.map((ct) => (
              <span key={ct} className={`change-badge change-badge--${ct}`}>
                {CHANGE_TYPE_LABELS[ct]}: {typeCounts[ct]}
              </span>
            ))}
          </div>

          {/* Filters */}
          <div className="compare-filters">
            <span>Φίλτρα:</span>
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

          {filteredDiffs.length === 0 ? (
            <EmptyState message="Κανένα αποτέλεσμα με τα τρέχοντα φίλτρα." />
          ) : (
            <p className="hint-text">{filteredDiffs.length} αλλαγές βρέθηκαν. Πατήστε «Επόμενο» για να δείτε τις διαφορές.</p>
          )}
        </>
      )}
    </StepContainer>
  )
}
