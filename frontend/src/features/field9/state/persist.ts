import type { IndicatorData, IndicatorSuggestion } from '../types'
import type { Field9State, StepStatus } from './reducer'
import { initialField9State } from './reducer'

const STORAGE_KEY = 'nomothetis-field9-session-v1'
const PERSIST_EVENT = 'field9-persist-changed'

/** Shape stored in localStorage (no File objects, Sets → arrays). */
interface Field9PersistedV1 {
  v: 1
  currentStep: Field9State['currentStep']

  extractStatus: StepStatus
  sector: string
  year: number | null
  lawTitle: string
  extractError: string | null

  suggestStatus: StepStatus
  suggestions: IndicatorSuggestion[]
  selectedDatasetIds: string[]
  suggestError: string | null

  fetchStatus: StepStatus
  indicators: IndicatorData[]
  referenceYear: number | null
  fiveYearRange: number[]
  targetValues: Record<string, string>
  fetchError: string | null

  flowCompleted: boolean
}

function notifyPersistListeners(): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event(PERSIST_EVENT))
}

export function stateToPersisted(state: Field9State): Field9PersistedV1 {
  return {
    v: 1,
    currentStep: state.currentStep,
    extractStatus: state.extractStatus,
    sector: state.sector,
    year: state.year,
    lawTitle: state.lawTitle,
    extractError: state.extractError,
    suggestStatus: state.suggestStatus,
    suggestions: state.suggestions,
    selectedDatasetIds: [...state.selectedDatasetIds],
    suggestError: state.suggestError,
    fetchStatus: state.fetchStatus,
    indicators: state.indicators,
    referenceYear: state.referenceYear,
    fiveYearRange: state.fiveYearRange,
    targetValues: state.targetValues,
    fetchError: state.fetchError,
    flowCompleted: state.flowCompleted,
  }
}

export function persistedToState(p: Field9PersistedV1): Field9State {
  const extractStatus: StepStatus = p.extractStatus === 'loading' ? 'idle' : (p.extractStatus ?? 'idle')
  const suggestStatus: StepStatus = p.suggestStatus === 'loading' ? 'idle' : (p.suggestStatus ?? 'idle')
  const fetchStatus: StepStatus = p.fetchStatus === 'loading' ? 'idle' : (p.fetchStatus ?? 'idle')

  return {
    ...initialField9State,
    currentStep: p.currentStep >= 1 && p.currentStep <= 3 ? p.currentStep : 1,
    file: null,
    extractStatus,
    sector: p.sector ?? '',
    year: p.year ?? null,
    lawTitle: p.lawTitle ?? '',
    extractError: p.extractError ?? null,
    suggestStatus,
    suggestions: Array.isArray(p.suggestions) ? p.suggestions : [],
    selectedDatasetIds: new Set(Array.isArray(p.selectedDatasetIds) ? p.selectedDatasetIds : []),
    suggestError: p.suggestError ?? null,
    fetchStatus,
    indicators: Array.isArray(p.indicators) ? p.indicators : [],
    referenceYear: p.referenceYear ?? null,
    fiveYearRange: Array.isArray(p.fiveYearRange) ? p.fiveYearRange : [],
    targetValues: p.targetValues && typeof p.targetValues === 'object' ? p.targetValues : {},
    fetchError: p.fetchError ?? null,
    flowCompleted: Boolean(p.flowCompleted),
  }
}

export function loadField9Persisted(): Field9State | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw) as Field9PersistedV1
    if (data?.v !== 1) return null
    return persistedToState(data)
  } catch {
    return null
  }
}

export function saveField9Persisted(state: Field9State): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToPersisted(state)))
    notifyPersistListeners()
  } catch {
    /* ignore quota / privacy mode */
  }
}

export function clearField9Persisted(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(STORAGE_KEY)
    notifyPersistListeners()
  } catch {
    /* ignore */
  }
}

export interface Field9HomeMeta {
  flowCompleted: boolean
  hasSavedSession: boolean
}

export function readField9HomeMeta(): Field9HomeMeta {
  if (typeof window === 'undefined') return { flowCompleted: false, hasSavedSession: false }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return { flowCompleted: false, hasSavedSession: false }
    const data = JSON.parse(raw) as Field9PersistedV1
    if (data?.v !== 1) return { flowCompleted: false, hasSavedSession: false }

    const hasSavedSession =
      (data.currentStep != null && data.currentStep > 1) ||
      Boolean(data.sector) ||
      (Array.isArray(data.indicators) && data.indicators.length > 0)

    return {
      flowCompleted: Boolean(data.flowCompleted),
      hasSavedSession,
    }
  } catch {
    return { flowCompleted: false, hasSavedSession: false }
  }
}

export function field9PersistEventName(): string {
  return PERSIST_EVENT
}
