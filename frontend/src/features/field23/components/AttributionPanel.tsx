import type { ArticleDiffOut, CommentContributionOut } from '../types'
import type { Field23State } from '../state/reducer'
import { LoadingPanel } from '../../../shared/ui/LoadingPanel'
import { ErrorBanner } from '../../../shared/ui/ErrorBanner'
import { EmptyState } from '../../../shared/ui/EmptyState'

interface Props {
  diff: ArticleDiffOut
  diffIndex: number
  state: Field23State
  onClose: () => void
}

const LIKELIHOOD_LABELS: Record<CommentContributionOut['contribution_likelihood'], string> = {
  none: 'Καμία',
  low: 'Χαμηλή',
  medium: 'Μέτρια',
  high: 'Υψηλή',
}

export function AttributionPanel({ diff, diffIndex, state, onClose }: Props) {
  const articleLabel = diff.old_article?.article_number ?? diff.new_article?.article_number ?? `#${diffIndex + 1}`
  const result = state.attributionResults[diffIndex]

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
            {!result || result.contributions.length === 0 ? (
              <EmptyState message="Δεν βρέθηκαν αποδόσεις σχολίων." />
            ) : (
              <ul className="attribution-list">
                {result.contributions.map((c) => (
                  <li key={c.comment_id} className={`attribution-item attribution-item--${c.contribution_likelihood}`}>
                    <div className="attribution-item__header">
                      <span className={`likelihood-badge likelihood-badge--${c.contribution_likelihood}`}>
                        {LIKELIHOOD_LABELS[c.contribution_likelihood]}
                      </span>
                      <span className="attribution-item__id">#{c.comment_id}</span>
                    </div>
                    <p className="attribution-item__rationale">{c.rationale_el}</p>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  )
}
