import { type Dispatch, useMemo, useState } from 'react'
import { StepHeader } from '../../../shared/ui/StepHeader'
import { StepContainer } from '../../../shared/ui/StepContainer'
import type { Field7Action, Field7State } from '../state/reducer'

interface Props {
  state: Field7State
  dispatch: Dispatch<Field7Action>
}

const ALL_SDGS = [
  { id: 1, title: 'Μηδενική Φτώχεια', color: '#E5243B' },
  { id: 2, title: 'Μηδενική Πείνα', color: '#DDA63A' },
  { id: 3, title: 'Καλή Υγεία και Ευημερία', color: '#4C9F38' },
  { id: 4, title: 'Ποιοτική Εκπαίδευση', color: '#C5192D' },
  { id: 5, title: 'Ισότητα των Φύλων', color: '#FF3A21' },
  { id: 6, title: 'Καθαρό Νερό και Αποχέτευση', color: '#26BDE2' },
  { id: 7, title: 'Φθηνή και Καθαρή Ενέργεια', color: '#FCC30B' },
  { id: 8, title: 'Αξιοπρεπής Εργασία και Οικονομική Ανάπτυξη', color: '#A21942' },
  { id: 9, title: 'Βιομηχανία, Καινοτομία και Υποδομές', color: '#FD6925' },
  { id: 10, title: 'Λιγότερες Ανισότητες', color: '#DD1367' },
  { id: 11, title: 'Βιώσιμες Πόλεις και Κοινότητες', color: '#FD9D24' },
  { id: 12, title: 'Υπεύθυνη Κατανάλωση και Παραγωγή', color: '#BF8B2E' },
  { id: 13, title: 'Δράση για το Κλίμα', color: '#3F7E44' },
  { id: 14, title: 'Ζωή στο Νερό', color: '#0A97D9' },
  { id: 15, title: 'Ζωή στη Στεριά', color: '#56C02B' },
  { id: 16, title: 'Ειρήνη, Δικαιοσύνη και Ισχυροί Θεσμοί', color: '#00689D' },
  { id: 17, title: 'Συνεργασία για τους Στόχους', color: '#19486A' },
] as const

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

  const acceptedIds = useMemo(() => new Set(accepted.map((item) => item.id)), [accepted])

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

      <div className="field7-template">
        <h3 className="field7-template__heading">
          7. Συμβατότητα με τους Στόχους Βιώσιμης Ανάπτυξης (SDGs)
        </h3>
        <div className="field7-sdg-grid" aria-label="SDG συμβατότητα">
          {ALL_SDGS.map(({ id, title, color }) => {
            const isAccepted = acceptedIds.has(id)
            return (
              <div
                key={id}
                className={`field7-sdg-grid__item ${isAccepted ? 'field7-sdg-grid__item--checked' : ''}`}
              >
                <span className="field7-sdg-grid__checkbox" aria-hidden="true">{isAccepted ? '☑' : '□'}</span>
                <div className="field7-sdg-grid__badge" style={{ backgroundColor: color }}>
                  <span className="field7-sdg-grid__number">{id}</span>
                  <span className="field7-sdg-grid__title">{title}</span>
                </div>
              </div>
            )
          })}
        </div>
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
