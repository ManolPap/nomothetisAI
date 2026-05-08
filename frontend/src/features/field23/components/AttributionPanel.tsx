import { type Dispatch, useMemo, useState } from 'react'
import type { ArticleDiffOut, CommentContributionOut } from '../types'
import type { Field23Action, Field23State } from '../state/reducer'
import { LoadingPanel } from '../../../shared/ui/LoadingPanel'
import { ErrorBanner } from '../../../shared/ui/ErrorBanner'
import { EmptyState } from '../../../shared/ui/EmptyState'

interface Props {
  diff: ArticleDiffOut
  diffIndex: number
  state: Field23State
  dispatch: Dispatch<Field23Action>
  onClose: () => void
}

const LIKELIHOOD_LABELS: Record<CommentContributionOut['contribution_likelihood'], string> = {
  none: 'Καμία',
  low: 'Χαμηλή',
  medium: 'Μέτρια',
  high: 'Υψηλή',
}
const ATTRIBUTION_LIKELIHOODS: CommentContributionOut['contribution_likelihood'][] = [
  'high',
  'medium',
  'low',
  'none',
]
const DEFAULT_SELECTED_LIKELIHOODS: CommentContributionOut['contribution_likelihood'][] = [
  'high',
  'medium',
]

export function AttributionPanel({ diff, diffIndex, state, dispatch, onClose }: Props) {
  const articleLabel = diff.old_article?.article_number ?? diff.new_article?.article_number ?? `#${diffIndex + 1}`
  const result = state.attributionResults[diffIndex]
  const [selectedLikelihoods, setSelectedLikelihoods] = useState<
    Set<CommentContributionOut['contribution_likelihood']>
  >(new Set(DEFAULT_SELECTED_LIKELIHOODS))
  const filteredContributions = useMemo(
    () =>
      result?.contributions.filter((c) => selectedLikelihoods.has(c.contribution_likelihood)) ?? [],
    [result?.contributions, selectedLikelihoods],
  )

  function toggleLikelihood(likelihood: CommentContributionOut['contribution_likelihood']) {
    setSelectedLikelihoods((prev) => {
      const next = new Set(prev)
      if (next.has(likelihood)) {
        next.delete(likelihood)
      } else {
        next.add(likelihood)
      }
      return next
    })
  }

  return (
    <div
      className="attribution-panel"
      role="dialog"
      aria-modal="true"
      aria-label={`Απόδοση σχολίων — Άρθρο ${articleLabel}`}
    >
      <div className="attribution-panel__backdrop" onClick={onClose} aria-hidden="true" />
      <div className="attribution-panel__content">
        <div className="attribution-panel__header">
          <h2>Απόδοση σχολίων — Άρθρο {articleLabel}</h2>
          <button type="button" className="btn btn-ghost" onClick={onClose} aria-label="Κλείσιμο">
            ✕
          </button>
        </div>

        {state.attributionStatus === 'loading' && (
          <LoadingPanel message="Ανάλυση σχολίων…" />
        )}

        {state.attributionError && (
          <ErrorBanner
            message={
              state.attributionError.includes('503')
                ? 'Η υπηρεσία απόδοσης δεν είναι διαθέσιμη. Δοκιμάστε αργότερα.'
                : state.attributionError
            }
          />
        )}

        {state.attributionStatus === 'ready' && (
          <>
            <div className="attribution-filters">
              <p className="attribution-filters__title">Φίλτρο συσχέτισης</p>
              <div className="attribution-filters__choices">
                {ATTRIBUTION_LIKELIHOODS.map((likelihood) => (
                  <label key={likelihood} className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={selectedLikelihoods.has(likelihood)}
                      onChange={() => toggleLikelihood(likelihood)}
                    />
                    {LIKELIHOOD_LABELS[likelihood]}
                  </label>
                ))}
              </div>
            </div>
            {!result || filteredContributions.length === 0 ? (
              <EmptyState message="Δεν βρέθηκαν αποδόσεις σχολίων." />
            ) : (
              <ul className="attribution-list">
                {filteredContributions.map((c) => {
                  const isAdopted = Boolean(c.adopted)

                  return (
                    <li
                      key={c.comment_id}
                      className={`attribution-item attribution-item--${c.contribution_likelihood}${
                        isAdopted ? ' attribution-item--adopted' : ''
                      }`}
                    >
                      <div className="attribution-item__header">
                        <span className={`likelihood-badge likelihood-badge--${c.contribution_likelihood}`}>
                          {LIKELIHOOD_LABELS[c.contribution_likelihood]}
                        </span>
                        <span className="attribution-item__id">#{c.comment_id}</span>
                      </div>
                      <p className="attribution-item__comment">
                        <strong>Σχόλιο:</strong> {c.comment_text || '—'}
                      </p>
                      <p className="attribution-item__rationale">
                        <strong>Αιτιολόγηση:</strong> {c.rationale_el}
                      </p>
                      <label
                        className={`attribution-item__adoption${isAdopted ? ' attribution-item__adoption--checked' : ''}`}
                      >
                        <input
                          type="checkbox"
                          checked={isAdopted}
                          onChange={(e) =>
                            dispatch({
                              type: 'SET_COMMENT_ADOPTED',
                              diffIndex,
                              commentId: c.comment_id,
                              adopted: e.target.checked,
                            })
                          }
                        />
                        <span className="attribution-item__adoption-icon" aria-hidden="true">
                          ✓
                        </span>
                        <span>{isAdopted ? 'Προσμετρήθηκε στα υιοθετημένα' : 'Υιοθετήθηκε'}</span>
                      </label>
                    </li>
                  )
                })}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  )
}
