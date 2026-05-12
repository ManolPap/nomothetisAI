import { type Dispatch, useEffect, useState } from 'react'
import { flushSync } from 'react-dom'
import { StepHeader } from '../../../shared/ui/StepHeader'
import { StepContainer } from '../../../shared/ui/StepContainer'
import { ErrorBanner } from '../../../shared/ui/ErrorBanner'
import { isApiError } from '../../../shared/api/errors'
import { synthesizeField6 } from '../api'
import {
  buildEurostatText,
  buildSelectedFactsTextFromStructured,
  buildSelectedSources,
  buildSynthesisText,
  parseFactsText,
  parseSynthesisText,
  type Field6SynthesisParts,
} from '../utils'
import type { Field6Action, Field6State } from '../state/reducer'

interface Props {
  state: Field6State
  dispatch: Dispatch<Field6Action>
}

/** Μπλοκάρει διπλό κλικ πριν προλάβει το reducer να ενημερώσει synthesisStatus → loading. */
let field6SynthesisInFlight = false

export function Step4Synthesis({ state, dispatch }: Props) {
  const [hasRun, setHasRun] = useState(state.synthesisStatus === 'ready')
  /** Συγχρονισμένο «busy» ώστε τα κουμπιά να κλειδώνουν πριν προλάβει paint χωρίς loading στο reducer. */
  const [synthesisPending, setSynthesisPending] = useState(false)
  const [parts, setParts] = useState<Field6SynthesisParts>(() => parseSynthesisText(state.synthesisText))

  useEffect(() => {
    setParts(parseSynthesisText(state.synthesisText))
  }, [state.synthesisText])

  async function runSynthesis() {
    if (!state.metadata || !state.factsText) return
    if (field6SynthesisInFlight) return
    field6SynthesisInFlight = true

    flushSync(() => {
      setSynthesisPending(true)
      dispatch({ type: 'SYNTHESIS_LOADING' })
    })

    try {
      const structuredCount =
        state.facts != null
          ? state.facts.i.length + state.facts.ii.length + state.facts.iii.length
          : 0
      const fromStructured =
        structuredCount > 0
          ? buildSelectedFactsTextFromStructured(state.facts, state.selectedFactIndices)
          : null
      const parsedFacts = parseFactsText(state.factsText)
      const selectedFacts =
        fromStructured ??
        (parsedFacts
          ? parsedFacts.filter((_, i) => state.selectedFactIndices.has(i)).join('\n')
          : state.factsText)

      const selectedEntries = Object.entries(state.eurostatData)
        .filter(([code]) => state.selectedCountryCodes.has(code))
        .map(([code, entry]) => ({
          countryCode: code,
          entry,
          selectedYears: Array.from(state.selectedYearsByCountry[code] ?? []),
        }))

      const eurostatText = buildEurostatText(state.indicatorName, selectedEntries)
      const selectedSources = buildSelectedSources(state.sources, state.selectedSourceUrls)

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
    } finally {
      field6SynthesisInFlight = false
      setSynthesisPending(false)
    }
  }

  const isLoading = state.synthesisStatus === 'loading' || synthesisPending

  function updatePart(partKey: keyof Field6SynthesisParts, value: string) {
    setParts((prev) => {
      const next = { ...prev, [partKey]: value }
      dispatch({ type: 'SET_SYNTHESIS_TEXT', text: buildSynthesisText(next) })
      return next
    })
  }

  return (
    <StepContainer
      onBack={() => dispatch({ type: 'GO_TO_STEP', step: 3 })}
      onNext={hasRun ? undefined : runSynthesis}
      nextLabel="Σύνθεση"
      nextDisabled={isLoading}
      isLoading={isLoading}
      showContinueHome
    >
      <StepHeader
        title="Σύνθεση Πεδίου 6"
        stepNumber={4}
        totalSteps={4}
        description="Παράγετε και επεξεργαστείτε το τελικό κείμενο."
      />

      {state.synthesisError && (
        <ErrorBanner message={state.synthesisError} onRetry={runSynthesis} />
      )}

      {state.synthesisStatus === 'ready' && (
        <div className="synthesis-result">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={runSynthesis}
            disabled={isLoading}
          >
            Εκ νέου Σύνθεση
          </button>
          <table className="field6-synthesis-table">
            <tbody>
              <tr>
                <td className="field6-synthesis-table__label">
                  i) σε άλλη/ες χώρα/ες της Ε.Ε. ή του ΟΟΣΑ:
                </td>
                <td>
                  <textarea
                    value={parts.i}
                    onChange={(e) => updatePart('i', e.target.value)}
                    rows={5}
                    aria-label="Συναφείς πρακτικές σε άλλη/ες χώρα/ες της Ε.Ε. ή του ΟΟΣΑ"
                  />
                </td>
              </tr>
              <tr>
                <td className="field6-synthesis-table__label">ii) σε όργανα της Ε.Ε.:</td>
                <td>
                  <textarea
                    value={parts.ii}
                    onChange={(e) => updatePart('ii', e.target.value)}
                    rows={5}
                    aria-label="Συναφείς πρακτικές σε όργανα της Ε.Ε."
                  />
                </td>
              </tr>
              <tr>
                <td className="field6-synthesis-table__label">iii) σε διεθνείς οργανισμούς:</td>
                <td>
                  <textarea
                    value={parts.iii}
                    onChange={(e) => updatePart('iii', e.target.value)}
                    rows={5}
                    aria-label="Συναφείς πρακτικές σε διεθνείς οργανισμούς"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      <div className="field6-step4-complete">
        {state.flowCompleted && (
          <p className="field6-step4-complete__done" role="status">
            Η ροή σημειώθηκε ως ολοκληρωμένη στην αρχική.
          </p>
        )}
        {!state.flowCompleted && state.synthesisStatus === 'ready' && (
          <button
            type="button"
            className="btn btn-field6-complete"
            onClick={() => dispatch({ type: 'MARK_FLOW_COMPLETED' })}
          >
            Ολοκληρώθηκε
          </button>
        )}
      </div>
    </StepContainer>
  )
}
