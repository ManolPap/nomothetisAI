import { type Dispatch, useMemo, useState } from 'react'
import { StepHeader } from '../../../shared/ui/StepHeader'
import { StepContainer } from '../../../shared/ui/StepContainer'
import { EmptyState } from '../../../shared/ui/EmptyState'
import type { Field7Action, Field7State } from '../state/reducer'

interface Props {
  state: Field7State
  dispatch: Dispatch<Field7Action>
}

function buildClipboardText(acceptedTitles: Array<{ id: number; title: string }>): string {
  if (acceptedTitles.length === 0) return ''
  const lines = ['7. Συμβατότητα με τους Στόχους Βιώσιμης Ανάπτυξης (SDGs):', '']
  for (const { id, title } of acceptedTitles) {
    lines.push(`☑ SDG ${id}: ${title}`)
  }
  return lines.join('\n')
}

export function Step2Result({ state, dispatch }: Props) {
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle')

  const accepted = useMemo(
    () =>
      state.matches
        .filter((m) => state.decisions[m.sdg_id] === 'accepted')
        .map((m) => ({ id: m.sdg_id, title: m.sdg_title })),
    [state.matches, state.decisions],
  )

  const clipboardText = useMemo(() => buildClipboardText(accepted), [accepted])

  async function handleCopy() {
    if (!clipboardText) return
    try {
      await navigator.clipboard.writeText(clipboardText)
      setCopyState('copied')
      setTimeout(() => setCopyState('idle'), 2500)
    } catch {
      setCopyState('failed')
      setTimeout(() => setCopyState('idle'), 2500)
    }
  }

  return (
    <StepContainer
      onBack={() => dispatch({ type: 'GO_TO_STEP', step: 1 })}
    >
      <StepHeader
        title="Τελικό αποτέλεσμα — Πεδίο 7"
        stepNumber={2}
        totalSteps={2}
        description="Τα αποδεκτά SDGs εμφανίζονται ως checkboxes, έτοιμα για το template της Βουλής."
      />

      {accepted.length === 0 ? (
        <EmptyState message="Δεν αποδεχτήκατε κανένα SDG. Επιστρέψτε στο Βήμα 1 για να επιλέξετε." />
      ) : (
        <>
          <div className="field7-template">
            <h3 className="field7-template__heading">
              7. Συμβατότητα με τους Στόχους Βιώσιμης Ανάπτυξης (SDGs)
            </h3>
            <ul className="field7-checklist" aria-label="Αποδεκτά SDGs">
              {accepted.map(({ id, title }) => (
                <li key={id} className={`field7-checklist__item field7-checklist__item--sdg-${id}`}>
                  <span className="field7-checklist__box" aria-hidden="true">☑</span>
                  <span className="field7-checklist__label">
                    <span className="field7-checklist__id">SDG {id}</span>
                    <span className="field7-checklist__title">{title}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="field7-template__actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleCopy}
            >
              {copyState === 'copied' ? 'Αντιγράφηκε ✓' : copyState === 'failed' ? 'Αποτυχία αντιγραφής' : 'Αντιγραφή'}
            </button>
          </div>
        </>
      )}

      <div className="field7-step2-complete">
        {state.flowCompleted && (
          <p className="field7-step2-complete__done" role="status">
            Η ροή σημειώθηκε ως ολοκληρωμένη στην αρχική.
          </p>
        )}
        {!state.flowCompleted && accepted.length > 0 && (
          <button
            type="button"
            className="btn btn-field7-complete"
            onClick={() => dispatch({ type: 'MARK_FLOW_COMPLETED' })}
          >
            Ολοκληρώθηκε
          </button>
        )}
      </div>
    </StepContainer>
  )
}
