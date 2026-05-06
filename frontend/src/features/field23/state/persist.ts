import type { ChangeType, ItemAttributionOut } from '../types'
import type { Field23State } from './reducer'
import { ALL_CHANGE_TYPES, initialField23State } from './reducer'

const STORAGE_KEY = 'nomothetis-field23-session-v1'
const PERSIST_EVENT = 'field23-persist-changed'

/** Shape stored in localStorage (no File objects). */
interface Field23PersistedV1 {
  v: 1
  currentStep: Field23State['currentStep']

  splitInitialStatus: Field23State['splitInitialStatus']
  splitFinalStatus: Field23State['splitFinalStatus']
  initialArticles: Field23State['initialArticles']
  finalArticles: Field23State['finalArticles']
  splitInitialError: Field23State['splitInitialError']
  splitFinalError: Field23State['splitFinalError']

  normalizeBefore: boolean
  compareStatus: Field23State['compareStatus']
  diffs: Field23State['diffs']
  compareError: Field23State['compareError']

  filterChangeTypes: ChangeType[]
  filterMinFraction: number
  filterArticleQuery: string

  selectedDiffIndex: Field23State['selectedDiffIndex']

  attributionStatus: Field23State['attributionStatus']
  attributionResults: Record<string, ItemAttributionOut>
  attributionError: Field23State['attributionError']

  flowCompleted: boolean
}

function notifyPersistListeners(): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event(PERSIST_EVENT))
}

/** Convert reducer state minus Files into storable JSON. */
export function stateToPersisted(state: Field23State): Field23PersistedV1 {
  const attributionPlain: Record<string, ItemAttributionOut> = {}
  Object.entries(state.attributionResults).forEach(([key, val]) => {
    attributionPlain[key] = val
  })

  return {
    v: 1,
    currentStep: state.currentStep,
    splitInitialStatus: state.splitInitialStatus,
    splitFinalStatus: state.splitFinalStatus,
    initialArticles: state.initialArticles,
    finalArticles: state.finalArticles,
    splitInitialError: state.splitInitialError,
    splitFinalError: state.splitFinalError,
    normalizeBefore: state.normalizeBefore,
    compareStatus: state.compareStatus,
    diffs: state.diffs,
    compareError: state.compareError,
    filterChangeTypes: [...state.filterChangeTypes],
    filterMinFraction: state.filterMinFraction,
    filterArticleQuery: state.filterArticleQuery,
    selectedDiffIndex: state.selectedDiffIndex,
    attributionStatus: state.attributionStatus,
    attributionResults: attributionPlain,
    attributionError: state.attributionError,
    flowCompleted: state.flowCompleted,
  }
}

function reviveFilterSet(types: ChangeType[]): Set<ChangeType> {
  const s = new Set<ChangeType>()
  for (const ct of types ?? []) {
    if (ALL_CHANGE_TYPES.includes(ct)) s.add(ct)
  }
  if (s.size === 0) return new Set(ALL_CHANGE_TYPES)
  return s
}

function reviveAttributionResults(raw: Record<string, ItemAttributionOut>): Record<number, ItemAttributionOut> {
  const out: Record<number, ItemAttributionOut> = {}
  Object.entries(raw).forEach(([k, v]) => {
    const n = Number(k)
    if (Number.isFinite(n)) out[n] = v
  })
  return out
}

/** Merge persisted snapshot into baseline (files stay null until chosen in UI). */
export function persistedToState(p: Field23PersistedV1): Field23State {
  const filterChangeTypes = reviveFilterSet(
    Array.isArray(p.filterChangeTypes) ? p.filterChangeTypes : [...ALL_CHANGE_TYPES],
  )

  const initialArticles = Array.isArray(p.initialArticles) ? p.initialArticles : []
  const finalArticles = Array.isArray(p.finalArticles) ? p.finalArticles : []

  let splitInitialStatus: Field23State['splitInitialStatus']
  let splitFinalStatus: Field23State['splitFinalStatus']
  if (initialArticles.length > 0) {
    splitInitialStatus = 'ready'
  } else if (p.splitInitialStatus === 'loading') {
    splitInitialStatus = 'idle'
  } else if (p.splitInitialStatus === 'error' || p.splitInitialStatus === 'ready') {
    splitInitialStatus = p.splitInitialStatus === 'ready' ? 'idle' : 'error'
  } else {
    splitInitialStatus = 'idle'
  }

  if (finalArticles.length > 0) {
    splitFinalStatus = 'ready'
  } else if (p.splitFinalStatus === 'loading') {
    splitFinalStatus = 'idle'
  } else if (p.splitFinalStatus === 'error' || p.splitFinalStatus === 'ready') {
    splitFinalStatus = p.splitFinalStatus === 'ready' ? 'idle' : 'error'
  } else {
    splitFinalStatus = 'idle'
  }

  let splitInitialError = p.splitInitialError ?? null
  let splitFinalError = p.splitFinalError ?? null
  if (initialArticles.length > 0) splitInitialError = null
  if (finalArticles.length > 0) splitFinalError = null

  let compareStatus = p.compareStatus
  let compareError = p.compareError
  const diffs = Array.isArray(p.diffs) ? p.diffs : []
  if (diffs.length > 0) {
    compareStatus = 'ready'
    compareError = null
  } else if (compareStatus === 'ready') {
    compareStatus = 'idle'
  }

  return {
    ...initialField23State,
    currentStep: p.currentStep >= 1 && p.currentStep <= 4 ? p.currentStep : 1,
    initialFile: null,
    finalFile: null,

    splitInitialStatus,
    splitFinalStatus,
    initialArticles,
    finalArticles,
    splitInitialError,
    splitFinalError,

    normalizeBefore: Boolean(p.normalizeBefore),
    compareStatus,
    diffs,
    compareError,

    filterChangeTypes,
    filterMinFraction: typeof p.filterMinFraction === 'number' ? p.filterMinFraction : 0,
    filterArticleQuery: typeof p.filterArticleQuery === 'string' ? p.filterArticleQuery : '',

    selectedDiffIndex:
      typeof p.selectedDiffIndex === 'number' || p.selectedDiffIndex === null
        ? p.selectedDiffIndex
        : null,

    attributionStatus: p.attributionStatus ?? 'idle',
    attributionResults: reviveAttributionResults(
      p.attributionResults && typeof p.attributionResults === 'object' ? p.attributionResults : {},
    ),
    attributionError: p.attributionError ?? null,

    flowCompleted: Boolean(p.flowCompleted),
  }
}

export function loadField23Persisted(): Field23State | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw) as Field23PersistedV1
    if (data?.v !== 1) return null
    return persistedToState(data)
  } catch {
    return null
  }
}

export function saveField23Persisted(state: Field23State): void {
  if (typeof window === 'undefined') return
  try {
    const blob = JSON.stringify(stateToPersisted(state))
    window.localStorage.setItem(STORAGE_KEY, blob)
    notifyPersistListeners()
  } catch {
    /* ignore quota / privacy mode */
  }
}

export function clearField23Persisted(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(STORAGE_KEY)
    notifyPersistListeners()
  } catch {
    /* ignore */
  }
}

export interface Field23HomeMeta {
  flowCompleted: boolean
  hasSavedSession: boolean
}

/** For HomePage card — does not need full hydrate. */
export function readField23HomeMeta(): Field23HomeMeta {
  if (typeof window === 'undefined') {
    return { flowCompleted: false, hasSavedSession: false }
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return { flowCompleted: false, hasSavedSession: false }
    const data = JSON.parse(raw) as Field23PersistedV1
    if (data?.v !== 1) return { flowCompleted: false, hasSavedSession: false }

    const hasSavedSession =
      (data.currentStep != null && data.currentStep > 1) ||
      (Array.isArray(data.initialArticles) && data.initialArticles.length > 0) ||
      (Array.isArray(data.finalArticles) && data.finalArticles.length > 0) ||
      (Array.isArray(data.diffs) && data.diffs.length > 0)

    return {
      flowCompleted: Boolean(data.flowCompleted),
      hasSavedSession,
    }
  } catch {
    return { flowCompleted: false, hasSavedSession: false }
  }
}

export function field23PersistEventName(): string {
  return PERSIST_EVENT
}
