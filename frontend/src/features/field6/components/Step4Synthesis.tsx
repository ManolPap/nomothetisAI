import { type Dispatch, useState } from 'react'
import { StepHeader } from '../../../shared/ui/StepHeader'
import { StepContainer } from '../../../shared/ui/StepContainer'
import { ErrorBanner } from '../../../shared/ui/ErrorBanner'
import { isApiError } from '../../../shared/api/errors'
import { synthesizeField6 } from '../api'
import { buildEurostatText, buildSelectedSources, countWords, parseFactsText } from '../utils'
import type { Field6Action, Field6State } from '../state/reducer'

interface Props {
  state: Field6State
  dispatch: Dispatch<Field6Action>
}

export function Step4Synthesis({ state, dispatch }: Props) {
  const [hasRun, setHasRun] = useState(state.synthesisStatus === 'ready')

  async function runSynthesis() {
    if (!state.metadata || !state.factsText) return

    const parsedFacts = parseFactsText(state.factsText)
    const selectedFacts = parsedFacts
      ? parsedFacts.filter((_, i) => state.selectedFactIndices.has(i)).join('\n')
      : state.factsText

    const selectedEntries = Object.entries(state.eurostatData)
      .filter(([code]) => state.selectedCountryCodes.has(code))
      .map(([code, entry]) => ({
        countryCode: code,
        entry,
        selectedYears: Array.from(state.selectedYearsByCountry[code] ?? []),
      }))

    const eurostatText = buildEurostatText(state.indicatorName, selectedEntries)
    const selectedSources = buildSelectedSources(state.sources, state.selectedSourceUrls)

    dispatch({ type: 'SYNTHESIS_LOADING' })
    try {
      const result = await synthesizeField6({
        metadata: state.metadata,
        facts_text: selectedFacts,
        eurostat_text: eurostatText,
        selected_sources: selectedSources,
      })
      dispatch({ type: 'SYNTHESIS_SUCCESS', payload: result })
      setHasRun(true)
    } catch (e) {
      const msg = isApiError(e) ? e.userMessage() : 'Άγνωστο σφάλμα'
      dispatch({ type: 'SYNTHESIS_ERROR', error: msg })
    }
  }

  const wordCount = countWords(state.synthesisText)
  const isLoading = state.synthesisStatus === 'loading'

  return (
    <StepContainer
      onBack={() => dispatch({ type: 'GO_TO_STEP', step: 3 })}
      onNext={hasRun ? undefined : runSynthesis}
      nextLabel="Σύνθεση"
      nextDisabled={isLoading}
      isLoading={isLoading}
    >
      <StepHeader
        title="Σύνθεση Πεδίου 6"
        stepNumber={4}
        totalSteps={4}
        description="Παράγετε και επεξεργαστείτε το τελικό κείμενο."
      />

      {!hasRun && (
        <button
          type="button"
          className="btn btn-primary"
          onClick={runSynthesis}
          disabled={isLoading}
        >
          {isLoading ? 'Σύνθεση…' : 'Εκτέλεση Σύνθεσης'}
        </button>
      )}

      {state.synthesisError && (
        <ErrorBanner message={state.synthesisError} onRetry={runSynthesis} />
      )}

      {state.synthesisStatus === 'ready' && (
        <div className="synthesis-result">
          <div className="synthesis-result__header">
            <span
              className={`word-count ${wordCount > 250 ? 'word-count--over' : ''}`}
              aria-live="polite"
            >
              Λέξεις: {wordCount} / 250
              {wordCount > 250 && (
                <span role="alert"> — Υπέρβαση ορίου!</span>
              )}
            </span>
            <button type="button" className="btn btn-secondary btn-sm" onClick={runSynthesis}>
              Εκ νέου Σύνθεση
            </button>
          </div>
          <textarea
            className="synthesis-textarea"
            value={state.synthesisText}
            onChange={(e) => dispatch({ type: 'SET_SYNTHESIS_TEXT', text: e.target.value })}
            rows={12}
            aria-label="Κείμενο σύνθεσης"
          />
        </div>
      )}
    </StepContainer>
  )
}
