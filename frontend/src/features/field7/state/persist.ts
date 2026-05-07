import type { SDGDecision, SDGMatch } from '../types'
import type { Field7State, StepStatus } from './reducer'
import { initialField7State } from './reducer'

const STORAGE_KEY = 'nomothetis-field7-session-v1'
const PERSIST_EVENT = 'field7-persist-changed'

interface Field7PersistedV1 {
  v: 1
  currentStep: Field7State['currentStep']

  classifyStatus: StepStatus
  matches: SDGMatch[]
  decisions: Record<number, SDGDecision>
  classifyError: string | null

  flowCompleted: boolean
}

function notifyPersistListeners(): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event(PERSIST_EVENT))
}

export function stateToPersisted(state: Field7State): Field7PersistedV1 {
  return {
    v: 1,
    currentStep: state.currentStep,
    classifyStatus: state.classifyStatus,
    matches: state.matches,
    decisions: state.decisions,
    classifyError: state.classifyError,
    flowCompleted: state.flowCompleted,
  }
}

export function persistedToState(p: Field7PersistedV1): Field7State {
  const classifyStatus: StepStatus = p.classifyStatus === 'loading' ? 'idle' : (p.classifyStatus ?? 'idle')

  return {
    ...initialField7State,
    currentStep: p.currentStep === 1 || p.currentStep === 2 ? p.currentStep : 1,
    file: null,
    classifyStatus,
    matches: Array.isArray(p.matches) ? p.matches : [],
    decisions: p.decisions && typeof p.decisions === 'object' ? p.decisions : {},
    classifyError: p.classifyError ?? null,
    flowCompleted: Boolean(p.flowCompleted),
  }
}

export function loadField7Persisted(): Field7State | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw) as Field7PersistedV1
    if (data?.v !== 1) return null
    return persistedToState(data)
  } catch {
    return null
  }
}

export function saveField7Persisted(state: Field7State): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToPersisted(state)))
    notifyPersistListeners()
  } catch {
    /* ignore quota / privacy mode */
  }
}

export function clearField7Persisted(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(STORAGE_KEY)
    notifyPersistListeners()
  } catch {
    /* ignore */
  }
}

export interface Field7HomeMeta {
  flowCompleted: boolean
  hasSavedSession: boolean
}

export function readField7HomeMeta(): Field7HomeMeta {
  if (typeof window === 'undefined') return { flowCompleted: false, hasSavedSession: false }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return { flowCompleted: false, hasSavedSession: false }
    const data = JSON.parse(raw) as Field7PersistedV1
    if (data?.v !== 1) return { flowCompleted: false, hasSavedSession: false }

    const hasSavedSession =
      (data.currentStep != null && data.currentStep > 1) ||
      (Array.isArray(data.matches) && data.matches.length > 0)

    return {
      flowCompleted: Boolean(data.flowCompleted),
      hasSavedSession,
    }
  } catch {
    return { flowCompleted: false, hasSavedSession: false }
  }
}

export function field7PersistEventName(): string {
  return PERSIST_EVENT
}
