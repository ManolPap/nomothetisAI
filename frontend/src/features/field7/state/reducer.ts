import type { ClassifyResponse, SDGDecision, SDGMatch } from '../types'

export type StepStatus = 'idle' | 'loading' | 'ready' | 'error'

export interface Field7State {
  currentStep: 1 | 2

  file: File | null
  classifyStatus: StepStatus
  matches: SDGMatch[]
  decisions: Record<number, SDGDecision>
  classifyError: string | null

  /** User clicked «Ολοκληρώθηκε» στο βήμα 2 · εμφανίζεται στην αρχική. */
  flowCompleted: boolean
}

export type Field7Action =
  | { type: 'SET_FILE'; file: File }
  | { type: 'CLASSIFY_LOADING' }
  | { type: 'CLASSIFY_SUCCESS'; payload: ClassifyResponse }
  | { type: 'CLASSIFY_ERROR'; error: string }
  | { type: 'SET_DECISION'; sdgId: number; decision: SDGDecision }
  | { type: 'GO_TO_STEP'; step: 1 | 2 }
  | { type: 'MARK_FLOW_COMPLETED' }
  | { type: 'RESET_FIELD7_WORKFLOW' }

export const initialField7State: Field7State = {
  currentStep: 1,
  file: null,
  classifyStatus: 'idle',
  matches: [],
  decisions: {},
  classifyError: null,
  flowCompleted: false,
}

function decisionsFromMatches(matches: SDGMatch[]): Record<number, SDGDecision> {
  const out: Record<number, SDGDecision> = {}
  for (const match of matches) {
    out[match.sdg_id] = 'pending'
  }
  return out
}

export function field7Reducer(state: Field7State, action: Field7Action): Field7State {
  switch (action.type) {
    case 'SET_FILE':
      return {
        ...state,
        file: action.file,
        currentStep: 1,
        classifyStatus: 'idle',
        matches: [],
        decisions: {},
        classifyError: null,
        flowCompleted: false,
      }
    case 'CLASSIFY_LOADING':
      return { ...state, classifyStatus: 'loading', classifyError: null }
    case 'CLASSIFY_SUCCESS':
      return {
        ...state,
        classifyStatus: 'ready',
        matches: action.payload.matches,
        decisions: decisionsFromMatches(action.payload.matches),
        classifyError: action.payload.error ?? null,
        flowCompleted: false,
      }
    case 'CLASSIFY_ERROR':
      return { ...state, classifyStatus: 'error', classifyError: action.error }
    case 'SET_DECISION':
      return {
        ...state,
        decisions: { ...state.decisions, [action.sdgId]: action.decision },
        flowCompleted: false,
      }
    case 'GO_TO_STEP':
      return { ...state, currentStep: action.step }
    case 'MARK_FLOW_COMPLETED':
      return { ...state, flowCompleted: true }
    case 'RESET_FIELD7_WORKFLOW':
      return { ...initialField7State }
    default:
      return state
  }
}
