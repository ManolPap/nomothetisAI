import { type Dispatch, useEffect } from 'react'
import { StepHeader } from '../../../shared/ui/StepHeader'
import { StepContainer } from '../../../shared/ui/StepContainer'
import { LoadingPanel } from '../../../shared/ui/LoadingPanel'
import { ErrorBanner } from '../../../shared/ui/ErrorBanner'
import { EmptyState } from '../../../shared/ui/EmptyState'
import { isApiError } from '../../../shared/api/errors'
import { compareLaws, splitLaw } from '../api'
import type { Field23Action, Field23State } from '../state/reducer'

interface Props {
  state: Field23State
  dispatch: Dispatch<Field23Action>
}

export function Step2Split({ state, dispatch }: Props) {
  async function splitInitial() {
    if (!state.initialFile) return
    dispatch({ type: 'SPLIT_INITIAL_LOADING' })
    try {
      const res = await splitLaw(state.initialFile)
      dispatch({ type: 'SPLIT_INITIAL_SUCCESS', articles: res.articles })
    } catch (e) {
      dispatch({ type: 'SPLIT_INITIAL_ERROR', error: isApiError(e) ? e.userMessage() : 'Σφάλμα' })
    }
  }

  async function splitFinal() {
    if (!state.finalFile) return
    dispatch({ type: 'SPLIT_FINAL_LOADING' })
    try {
      const res = await splitLaw(state.finalFile)
      dispatch({ type: 'SPLIT_FINAL_SUCCESS', articles: res.articles })
    } catch (e) {
      dispatch({ type: 'SPLIT_FINAL_ERROR', error: isApiError(e) ? e.userMessage() : 'Σφάλμα' })
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    let cancelled = false

    async function runSplitWorkflow() {
      if (state.splitInitialStatus === 'idle' && !cancelled) {
        await splitInitial()
      }
      if (state.splitFinalStatus === 'idle' && !cancelled) {
        await splitFinal()
      }
    }

    void runSplitWorkflow()

    return () => {
      cancelled = true
    }
  }, []) 

  const bothReady = state.splitInitialStatus === 'ready' && state.splitFinalStatus === 'ready'
  const isLoading =
    state.splitInitialStatus === 'loading' ||
    state.splitFinalStatus === 'loading' ||
    state.compareStatus === 'loading'

  async function runCompareAndContinue() {
    if (!bothReady || state.compareStatus === 'loading') return
    dispatch({ type: 'COMPARE_LOADING' })
    try {
      const res = await compareLaws({
        initial_law_articles: state.initialArticles,
        final_law_articles: state.finalArticles,
        normalize_before_diff: true,
      })
      dispatch({ type: 'COMPARE_SUCCESS', diffs: res.diffs })
      dispatch({ type: 'GO_TO_STEP', step: 3 })
    } catch (e) {
      dispatch({ type: 'COMPARE_ERROR', error: isApiError(e) ? e.userMessage() : 'Σφάλμα' })
    }
  }

  return (
    <>
      <div className="step-header--standalone">
        <StepHeader title="Διαχωρισμός Άρθρων" stepNumber={2} totalSteps={4} />
      </div>
      <StepContainer
        onBack={() => dispatch({ type: 'GO_TO_STEP', step: 1 })}
        onNext={() => { void runCompareAndContinue() }}
        nextDisabled={!bothReady}
        isLoading={isLoading}
      >
        <div className="split-results split-results--wide">
          <div className="split-results__col split-results__col--wide">
            <h3>Αρχικός Νόμος</h3>
            {state.splitInitialStatus === 'loading' && <LoadingPanel message="Διαχωρισμός…" />}
            {state.splitInitialError && <ErrorBanner message={state.splitInitialError} onRetry={splitInitial} />}
            {state.splitInitialStatus === 'ready' && (
              state.initialArticles.length === 0 ? (
                <EmptyState message="Δεν βρέθηκαν άρθρα." />
              ) : (
                <ArticlePreview articles={state.initialArticles} />
              )
            )}
          </div>
          <div className="split-results__col split-results__col--wide">
            <h3>Τελικός Νόμος</h3>
            {state.splitFinalStatus === 'loading' && <LoadingPanel message="Διαχωρισμός…" />}
            {state.splitFinalError && <ErrorBanner message={state.splitFinalError} onRetry={splitFinal} />}
            {state.splitFinalStatus === 'ready' && (
              state.finalArticles.length === 0 ? (
                <EmptyState message="Δεν βρέθηκαν άρθρα." />
              ) : (
                <ArticlePreview articles={state.finalArticles} />
              )
            )}
          </div>
        </div>
        {state.compareError && <ErrorBanner message={state.compareError} onRetry={runCompareAndContinue} />}
      </StepContainer>
    </>
  )
}

function ArticlePreview({ articles }: { articles: { article_number: string; title: string }[] }) {
  return (
    <div className="article-preview">
      <p className="article-preview__count">{articles.length} άρθρα βρέθηκαν</p>
      <ul className="article-preview__list article-preview__list--detailed">
        {articles.slice(0, 40).map((a) => (
          <li key={`${a.article_number}-${a.title}`} className="article-preview__item">
            <p className="article-preview__article">Άρθρο {a.article_number}</p>
            <p className="article-preview__title">
              <span>Title:</span> {a.title || 'Χωρίς τίτλο'}
            </p>
          </li>
        ))}
        {articles.length > 40 && <li className="article-preview__more">…και {articles.length - 40} ακόμη</li>}
      </ul>
    </div>
  )
}
