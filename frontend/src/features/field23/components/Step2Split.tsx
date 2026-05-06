import { type Dispatch, useEffect } from 'react'
import { StepHeader } from '../../../shared/ui/StepHeader'
import { StepContainer } from '../../../shared/ui/StepContainer'
import { LoadingPanel } from '../../../shared/ui/LoadingPanel'
import { ErrorBanner } from '../../../shared/ui/ErrorBanner'
import { EmptyState } from '../../../shared/ui/EmptyState'
import { isApiError } from '../../../shared/api/errors'
import { splitLaw } from '../api'
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
    if (state.splitInitialStatus === 'idle') splitInitial()
    if (state.splitFinalStatus === 'idle') splitFinal()
  }, []) 

  const bothReady = state.splitInitialStatus === 'ready' && state.splitFinalStatus === 'ready'
  const isLoading = state.splitInitialStatus === 'loading' || state.splitFinalStatus === 'loading'

  return (
    <StepContainer
      onBack={() => dispatch({ type: 'GO_TO_STEP', step: 1 })}
      onNext={() => dispatch({ type: 'GO_TO_STEP', step: 3 })}
      nextDisabled={!bothReady}
      isLoading={isLoading}
    >
      <StepHeader title="Διαχωρισμός Άρθρων" stepNumber={2} totalSteps={4} />

      <div className="split-results">
        <div className="split-results__col">
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
        <div className="split-results__col">
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
    </StepContainer>
  )
}

function ArticlePreview({ articles }: { articles: { article_number: string; title: string }[] }) {
  return (
    <details className="article-preview">
      <summary>{articles.length} άρθρα βρέθηκαν</summary>
      <ul className="article-preview__list">
        {articles.slice(0, 20).map((a) => (
          <li key={a.article_number}>
            <strong>Άρθρο {a.article_number}</strong>: {a.title}
          </li>
        ))}
        {articles.length > 20 && <li>…και {articles.length - 20} ακόμη</li>}
      </ul>
    </details>
  )
}
