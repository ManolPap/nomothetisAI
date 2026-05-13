import { type Dispatch, useCallback, useEffect } from 'react'
import { StepHeader } from '../../../shared/ui/StepHeader'
import { StepContainer } from '../../../shared/ui/StepContainer'
import { LoadingPanel } from '../../../shared/ui/LoadingPanel'
import { ErrorBanner } from '../../../shared/ui/ErrorBanner'
import { EmptyState } from '../../../shared/ui/EmptyState'
import { isApiError } from '../../../shared/api/errors'
import { webSearch } from '../api'
import type { Field6Action, Field6State } from '../state/reducer'
import { FACT_CATEGORY_LABELS, factItemToDisplayText } from '../utils'
import type { FactsPayload } from '../types'

const CATEGORY_LABELS_LEGACY: Record<string, string> = {
  ΚΑΤΗΓΟΡΙΑ_i: 'Χώρες ΕΕ/ΟΟΣΑ',
  ΚΑΤΗΓΟΡΙΑ_ii: 'Όργανα ΕΕ',
  ΚΑΤΗΓΟΡΙΑ_iii: 'Διεθνείς Οργανισμοί',
}

type FactDisplayItem =
  | { kind: 'header'; label: string }
  | { kind: 'fact'; text: string; idx: number }

function buildFactDisplayItems(factsText: string): FactDisplayItem[] {
  const items: FactDisplayItem[] = []
  let factIdx = 0
  for (const rawLine of factsText.split('\n')) {
    const line = rawLine.trim()
    if (!line) continue
    const catMatch = line.match(/^(ΚΑΤΗΓΟΡΙΑ_\w+)/i)
    if (catMatch) {
      const label = CATEGORY_LABELS_LEGACY[catMatch[1]] ?? catMatch[1]
      items.push({ kind: 'header', label })
      continue
    }
    const content = line
      .replace(/^\*?\s*FACT_[ivxlcdm]+:?\s*/i, '')
      .replace(/\*+\s*$/, '')
      .replace(/(\s*\|\s*-\s*)+\s*$/g, '')
      .trim()
    if (!content || content === '-') continue
    items.push({ kind: 'fact', text: content, idx: factIdx++ })
  }
  return items
}

function buildStructuredFactDisplayItems(facts: FactsPayload): FactDisplayItem[] {
  const items: FactDisplayItem[] = []
  let factIdx = 0
  for (const cat of ['i', 'ii', 'iii'] as const) {
    const list = facts[cat]
    if (list.length === 0) continue
    items.push({ kind: 'header', label: FACT_CATEGORY_LABELS[cat] })
    for (const it of list) {
      items.push({ kind: 'fact', text: factItemToDisplayText(it), idx: factIdx++ })
    }
  }
  return items
}

function renderTextWithLinks(text: string) {
  const parts = text.split(/(https?:\/\/[^\s\[\]]+)/g)
  return parts.map((part, i) =>
    /^https?:\/\//.test(part) ? (
      <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="fact-source-link">
        {part}
      </a>
    ) : (
      part
    ),
  )
}

interface Props {
  state: Field6State
  dispatch: Dispatch<Field6Action>
}

/** Φράζει ταυτόχρονο διπλό web-search (React Strict Mode dev ή διπλό effect πριν προλάβει το loading state). */
let field6WebSearchInFlight = false

export function Step2WebFacts({ state, dispatch }: Props) {
  const fetchFacts = useCallback(async () => {
    const meta = state.metadata
    if (!meta) return
    if (field6WebSearchInFlight) return
    field6WebSearchInFlight = true
    dispatch({ type: 'WEB_LOADING' })
    try {
      const result = await webSearch({ metadata: meta, nim_text: '' })
      dispatch({ type: 'WEB_SUCCESS', payload: result })
    } catch (e) {
      const msg = isApiError(e) ? e.userMessage() : 'Άγνωστο σφάλμα'
      dispatch({ type: 'WEB_ERROR', error: msg })
    } finally {
      field6WebSearchInFlight = false
    }
  }, [dispatch, state.metadata])

  useEffect(() => {
    if (state.webStatus !== 'idle') return
    if (!state.metadata) return
    void fetchFacts()
  }, [fetchFacts, state.metadata, state.webStatus])

  const factItems =
    state.facts != null
      ? buildStructuredFactDisplayItems(state.facts)
      : state.factsText
        ? buildFactDisplayItems(state.factsText)
        : []
  const hasFacts = factItems.some((it) => it.kind === 'fact')
  const canContinue = state.webStatus === 'ready' && state.selectedFactIndices.size > 0

  return (
    <StepContainer
      onBack={() => dispatch({ type: 'GO_TO_STEP', step: 1 })}
      onNext={() => dispatch({ type: 'GO_TO_STEP', step: 3 })}
      nextDisabled={!canContinue}
      isLoading={state.webStatus === 'loading'}
    >
      <StepHeader title="Επιλογή Συναφών Πρακτικών" stepNumber={2} totalSteps={4} />

      {state.webStatus === 'loading' && <LoadingPanel message="Αναζήτηση πρακτικών…" />}
      {state.webError && <ErrorBanner message={state.webError} onRetry={fetchFacts} />}

      {state.webStatus === 'ready' && (
        <>
          <section className="facts-section">
            <h3>Συναφείς Πρακτικές</h3>
            {hasFacts ? (
              <ul className="checkbox-list">
                {factItems.map((item, i) => {
                  if (item.kind === 'header') {
                    return (
                      <li key={i} className="checkbox-list__category-header">
                        <strong>{item.label}</strong>
                      </li>
                    )
                  }
                  return (
                    <li key={i} className="checkbox-list__item">
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={state.selectedFactIndices.has(item.idx)}
                          onChange={() => dispatch({ type: 'TOGGLE_FACT', index: item.idx })}
                        />
                        <span>{renderTextWithLinks(item.text)}</span>
                      </label>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <div>
                <p className="facts-raw-label">Ακατέργαστο κείμενο facts (επιλέξτε τα επιθυμητά τμήματα):</p>
                {state.factsText ? (
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={state.selectedFactIndices.has(0)}
                      onChange={() => dispatch({ type: 'TOGGLE_FACT', index: 0 })}
                    />
                    <pre className="facts-raw">{state.factsText}</pre>
                  </label>
                ) : (
                  <EmptyState message="Δεν επιστράφηκαν facts." />
                )}
              </div>
            )}
          </section>

        </>
      )}
    </StepContainer>
  )
}
