import type { EurostatCountryEntry, FactsPayload, LawMetadata, WebSource } from '../types'
import type { Field6State, StepStatus } from './reducer'
import { initialField6State } from './reducer'

const STORAGE_KEY = 'nomothetis-field6-session-v1'
const PERSIST_EVENT = 'field6-persist-changed'

/** Shape stored in localStorage (no File objects, Sets → arrays). */
interface Field6PersistedV1 {
  v: 1
  currentStep: Field6State['currentStep']

  metadataStatus: StepStatus
  metadata: LawMetadata | null
  nimText: string
  metadataError: string | null

  webStatus: StepStatus
  sources: WebSource[]
  facts?: FactsPayload | null
  factsText: string
  selectedFactIndices: number[]
  selectedSourceUrls: string[]
  webError: string | null

  eurostatStatus: StepStatus
  eurostatData: Record<string, EurostatCountryEntry>
  indicatorName: string
  selectedCountryCodes: string[]
  selectedYearsByCountry: Record<string, string[]>
  eurostatError: string | null

  synthesisStatus: StepStatus
  synthesisText: string
  wordCount: number
  synthesisError: string | null

  flowCompleted: boolean
}

function notifyPersistListeners(): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event(PERSIST_EVENT))
}

export function stateToPersisted(state: Field6State): Field6PersistedV1 {
  const selectedYearsByCountry: Record<string, string[]> = {}
  Object.entries(state.selectedYearsByCountry).forEach(([code, years]) => {
    selectedYearsByCountry[code] = [...years]
  })

  return {
    v: 1,
    currentStep: state.currentStep,
    metadataStatus: state.metadataStatus,
    metadata: state.metadata,
    nimText: state.nimText,
    metadataError: state.metadataError,
    webStatus: state.webStatus,
    sources: state.sources,
    facts: state.facts ?? undefined,
    factsText: state.factsText,
    selectedFactIndices: [...state.selectedFactIndices],
    selectedSourceUrls: [...state.selectedSourceUrls],
    webError: state.webError,
    eurostatStatus: state.eurostatStatus,
    eurostatData: state.eurostatData,
    indicatorName: state.indicatorName,
    selectedCountryCodes: [...state.selectedCountryCodes],
    selectedYearsByCountry,
    eurostatError: state.eurostatError,
    synthesisStatus: state.synthesisStatus,
    synthesisText: state.synthesisText,
    wordCount: state.wordCount,
    synthesisError: state.synthesisError,
    flowCompleted: state.flowCompleted,
  }
}

export function persistedToState(p: Field6PersistedV1): Field6State {
  const selectedYearsByCountry: Record<string, Set<string>> = {}
  if (p.selectedYearsByCountry && typeof p.selectedYearsByCountry === 'object') {
    Object.entries(p.selectedYearsByCountry).forEach(([code, years]) => {
      selectedYearsByCountry[code] = new Set(Array.isArray(years) ? years : [])
    })
  }

  const metadataStatus: StepStatus = p.metadataStatus === 'loading' ? 'idle' : (p.metadataStatus ?? 'idle')
  const webStatus: StepStatus = p.webStatus === 'loading' ? 'idle' : (p.webStatus ?? 'idle')
  const eurostatStatus: StepStatus = p.eurostatStatus === 'loading' ? 'idle' : (p.eurostatStatus ?? 'idle')
  const synthesisStatus: StepStatus = p.synthesisStatus === 'loading' ? 'idle' : (p.synthesisStatus ?? 'idle')

  return {
    ...initialField6State,
    currentStep: p.currentStep >= 1 && p.currentStep <= 4 ? p.currentStep : 1,
    file: null,
    metadataStatus,
    metadata: p.metadata ?? null,
    nimText: p.nimText ?? '',
    metadataError: p.metadataError ?? null,
    webStatus,
    sources: Array.isArray(p.sources) ? p.sources : [],
    facts: p.facts ?? null,
    factsText: p.factsText ?? '',
    selectedFactIndices: new Set(Array.isArray(p.selectedFactIndices) ? p.selectedFactIndices : []),
    selectedSourceUrls: new Set(Array.isArray(p.selectedSourceUrls) ? p.selectedSourceUrls : []),
    webError: p.webError ?? null,
    eurostatStatus,
    eurostatData: p.eurostatData && typeof p.eurostatData === 'object' ? p.eurostatData : {},
    indicatorName: p.indicatorName ?? '',
    selectedCountryCodes: new Set(Array.isArray(p.selectedCountryCodes) ? p.selectedCountryCodes : []),
    selectedYearsByCountry,
    eurostatError: p.eurostatError ?? null,
    synthesisStatus,
    synthesisText: p.synthesisText ?? '',
    wordCount: typeof p.wordCount === 'number' ? p.wordCount : 0,
    synthesisError: p.synthesisError ?? null,
    flowCompleted: Boolean(p.flowCompleted),
  }
}

export function loadField6Persisted(): Field6State | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw) as Field6PersistedV1
    if (data?.v !== 1) return null
    return persistedToState(data)
  } catch {
    return null
  }
}

export function saveField6Persisted(state: Field6State): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToPersisted(state)))
    notifyPersistListeners()
  } catch {
    /* ignore quota / privacy mode */
  }
}

export function clearField6Persisted(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(STORAGE_KEY)
    notifyPersistListeners()
  } catch {
    /* ignore */
  }
}

export interface Field6HomeMeta {
  flowCompleted: boolean
  hasSavedSession: boolean
}

export function readField6HomeMeta(): Field6HomeMeta {
  if (typeof window === 'undefined') return { flowCompleted: false, hasSavedSession: false }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return { flowCompleted: false, hasSavedSession: false }
    const data = JSON.parse(raw) as Field6PersistedV1
    if (data?.v !== 1) return { flowCompleted: false, hasSavedSession: false }

    const hasFactsStructured =
      data.facts != null &&
      (data.facts.i?.length ?? 0) + (data.facts.ii?.length ?? 0) + (data.facts.iii?.length ?? 0) > 0
    const hasSavedSession =
      (data.currentStep != null && data.currentStep > 1) ||
      Boolean(data.metadata) ||
      Boolean(data.factsText) ||
      hasFactsStructured ||
      Boolean(data.synthesisText)

    return {
      flowCompleted: Boolean(data.flowCompleted),
      hasSavedSession,
    }
  } catch {
    return { flowCompleted: false, hasSavedSession: false }
  }
}

export function field6PersistEventName(): string {
  return PERSIST_EVENT
}
