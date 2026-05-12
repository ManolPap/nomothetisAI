import type { AnalyzeField30Response } from '../types'
import type { Field30State, PersistedFileMeta, StepStatus } from './reducer'
import { initialField30State } from './reducer'

const STORAGE_KEY = 'nomothetis-field30-session-v1'
const PERSIST_EVENT = 'field30-persist-changed'

interface Field30PersistedV1 {
  v: 1
  fileMeta: PersistedFileMeta | null
  analyzeStatus: StepStatus
  result: AnalyzeField30Response | null
  analyzeError: string | null
  flowCompleted: boolean
}

function notifyPersistListeners(): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event(PERSIST_EVENT))
}

function reviveFileMeta(raw: unknown): PersistedFileMeta | null {
  if (!raw || typeof raw !== 'object') return null
  const meta = raw as Partial<PersistedFileMeta>
  if (
    typeof meta.name !== 'string' ||
    typeof meta.size !== 'number' ||
    typeof meta.lastModified !== 'number'
  ) {
    return null
  }
  return {
    name: meta.name,
    size: meta.size,
    lastModified: meta.lastModified,
  }
}

export function stateToPersisted(state: Field30State): Field30PersistedV1 {
  return {
    v: 1,
    fileMeta: state.fileMeta,
    analyzeStatus: state.analyzeStatus,
    result: state.result,
    analyzeError: state.analyzeError,
    flowCompleted: state.flowCompleted,
  }
}

export function persistedToState(p: Field30PersistedV1): Field30State {
  const result = p.result && typeof p.result === 'object' ? p.result : null
  let analyzeStatus: StepStatus = p.analyzeStatus === 'loading' ? 'idle' : (p.analyzeStatus ?? 'idle')

  if (result && analyzeStatus === 'idle') analyzeStatus = 'ready'
  if (!result && analyzeStatus === 'ready') analyzeStatus = 'idle'

  return {
    ...initialField30State,
    file: null,
    fileMeta: reviveFileMeta(p.fileMeta),
    analyzeStatus,
    result,
    analyzeError: p.analyzeError ?? null,
    flowCompleted: Boolean(p.flowCompleted),
  }
}

export function loadField30Persisted(): Field30State | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw) as Field30PersistedV1
    if (data?.v !== 1) return null
    return persistedToState(data)
  } catch {
    return null
  }
}

export function saveField30Persisted(state: Field30State): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToPersisted(state)))
    notifyPersistListeners()
  } catch {
    /* ignore quota / privacy mode */
  }
}

export function clearField30Persisted(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(STORAGE_KEY)
    notifyPersistListeners()
  } catch {
    /* ignore */
  }
}

export interface Field30HomeMeta {
  flowCompleted: boolean
  hasSavedSession: boolean
  result: AnalyzeField30Response | null
}

export function readField30HomeMeta(): Field30HomeMeta {
  if (typeof window === 'undefined') return { flowCompleted: false, hasSavedSession: false, result: null }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return { flowCompleted: false, hasSavedSession: false, result: null }
    const data = JSON.parse(raw) as Field30PersistedV1
    if (data?.v !== 1) return { flowCompleted: false, hasSavedSession: false, result: null }
    const result = data.result && typeof data.result === 'object' ? data.result : null

    const hasSavedSession =
      Boolean(data.fileMeta) ||
      Boolean(result) ||
      Boolean(data.analyzeError) ||
      (data.analyzeStatus != null && data.analyzeStatus !== 'idle')

    return {
      flowCompleted: Boolean(data.flowCompleted),
      hasSavedSession,
      result,
    }
  } catch {
    return { flowCompleted: false, hasSavedSession: false, result: null }
  }
}

export function field30PersistEventName(): string {
  return PERSIST_EVENT
}
