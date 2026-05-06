import type {
  EurostatCountryEntry,
  EurostatResponse,
  LawMetadata,
  MetadataResponse,
  SynthesizeResponse,
  WebSearchResponse,
  WebSource,
} from '../types'

export type StepStatus = 'idle' | 'loading' | 'ready' | 'error'

export interface Field6State {
  currentStep: 1 | 2 | 3 | 4

  // Step 1
  file: File | null
  metadataStatus: StepStatus
  metadata: LawMetadata | null
  nimText: string
  metadataError: string | null

  // Step 2
  webStatus: StepStatus
  sources: WebSource[]
  factsText: string
  selectedFactIndices: Set<number>
  selectedSourceUrls: Set<string>
  webError: string | null

  // Step 3
  eurostatStatus: StepStatus
  eurostatData: Record<string, EurostatCountryEntry>
  indicatorName: string
  selectedCountryCodes: Set<string>
  selectedYearsByCountry: Record<string, Set<string>>
  eurostatError: string | null

  // Step 4
  synthesisStatus: StepStatus
  synthesisText: string
  wordCount: number
  synthesisError: string | null

  /** User clicked «Ολοκληρώθηκε» στο βήμα 4 · εμφανίζεται στην αρχική. */
  flowCompleted: boolean
}

export type Field6Action =
  | { type: 'SET_FILE'; file: File }
  | { type: 'METADATA_LOADING' }
  | { type: 'METADATA_SUCCESS'; payload: MetadataResponse }
  | { type: 'METADATA_ERROR'; error: string }
  | { type: 'UPDATE_METADATA'; metadata: LawMetadata }
  | { type: 'WEB_LOADING' }
  | { type: 'WEB_SUCCESS'; payload: WebSearchResponse }
  | { type: 'WEB_ERROR'; error: string }
  | { type: 'TOGGLE_FACT'; index: number }
  | { type: 'TOGGLE_SOURCE'; url: string }
  | { type: 'EUROSTAT_LOADING' }
  | { type: 'EUROSTAT_SUCCESS'; payload: EurostatResponse }
  | { type: 'EUROSTAT_ERROR'; error: string }
  | { type: 'TOGGLE_COUNTRY'; code: string }
  | { type: 'TOGGLE_YEAR'; countryCode: string; year: string }
  | { type: 'SYNTHESIS_LOADING' }
  | { type: 'SYNTHESIS_SUCCESS'; payload: SynthesizeResponse }
  | { type: 'SYNTHESIS_ERROR'; error: string }
  | { type: 'SET_SYNTHESIS_TEXT'; text: string }
  | { type: 'GO_TO_STEP'; step: 1 | 2 | 3 | 4 }
  | { type: 'MARK_FLOW_COMPLETED' }
  | { type: 'RESET_FIELD6_WORKFLOW' }

export const initialField6State: Field6State = {
  currentStep: 1,
  file: null,
  metadataStatus: 'idle',
  metadata: null,
  nimText: '',
  metadataError: null,
  webStatus: 'idle',
  sources: [],
  factsText: '',
  selectedFactIndices: new Set(),
  selectedSourceUrls: new Set(),
  webError: null,
  eurostatStatus: 'idle',
  eurostatData: {},
  indicatorName: '',
  selectedCountryCodes: new Set(),
  selectedYearsByCountry: {},
  eurostatError: null,
  synthesisStatus: 'idle',
  synthesisText: '',
  wordCount: 0,
  synthesisError: null,
  flowCompleted: false,
}

function invalidateFromStep2(): Partial<Field6State> {
  return {
    webStatus: 'idle', sources: [], factsText: '', selectedFactIndices: new Set(),
    selectedSourceUrls: new Set(), webError: null,
    eurostatStatus: 'idle', eurostatData: {}, indicatorName: '',
    selectedCountryCodes: new Set(), selectedYearsByCountry: {}, eurostatError: null,
    synthesisStatus: 'idle', synthesisText: '', wordCount: 0, synthesisError: null,
    flowCompleted: false,
  }
}

function invalidateFromStep3(): Partial<Field6State> {
  return {
    eurostatStatus: 'idle', eurostatData: {}, indicatorName: '',
    selectedCountryCodes: new Set(), selectedYearsByCountry: {}, eurostatError: null,
    synthesisStatus: 'idle', synthesisText: '', wordCount: 0, synthesisError: null,
    flowCompleted: false,
  }
}

function invalidateSynthesis(): Partial<Field6State> {
  return { synthesisStatus: 'idle', synthesisText: '', wordCount: 0, synthesisError: null, flowCompleted: false }
}

export function field6Reducer(state: Field6State, action: Field6Action): Field6State {
  switch (action.type) {
    case 'SET_FILE':
      return {
        ...state, file: action.file, currentStep: 1,
        metadataStatus: 'idle', metadata: null, nimText: '', metadataError: null,
        flowCompleted: false,
        ...invalidateFromStep2(),
      }
    case 'METADATA_LOADING':
      return { ...state, metadataStatus: 'loading', metadataError: null }
    case 'METADATA_SUCCESS':
      return {
        ...state,
        metadataStatus: 'ready',
        metadata: action.payload.metadata,
        nimText: action.payload.nim_text,
        metadataError: null,
        ...invalidateFromStep2(),
      }
    case 'METADATA_ERROR':
      return { ...state, metadataStatus: 'error', metadataError: action.error }
    case 'UPDATE_METADATA':
      return { ...state, metadata: action.metadata, ...invalidateFromStep2() }
    case 'WEB_LOADING':
      return { ...state, webStatus: 'loading', webError: null }
    case 'WEB_SUCCESS':
      return {
        ...state,
        webStatus: 'ready',
        sources: action.payload.sources,
        factsText: action.payload.facts_text,
        selectedFactIndices: new Set(),
        selectedSourceUrls: new Set(),
        webError: null,
        ...invalidateFromStep3(),
      }
    case 'WEB_ERROR':
      return { ...state, webStatus: 'error', webError: action.error }
    case 'TOGGLE_FACT': {
      const next = new Set(state.selectedFactIndices)
      if (next.has(action.index)) { next.delete(action.index) } else { next.add(action.index) }
      return { ...state, selectedFactIndices: next, ...invalidateSynthesis() }
    }
    case 'TOGGLE_SOURCE': {
      const next = new Set(state.selectedSourceUrls)
      if (next.has(action.url)) { next.delete(action.url) } else { next.add(action.url) }
      return { ...state, selectedSourceUrls: next, ...invalidateSynthesis() }
    }
    case 'EUROSTAT_LOADING':
      return { ...state, eurostatStatus: 'loading', eurostatError: null }
    case 'EUROSTAT_SUCCESS':
      return {
        ...state,
        eurostatStatus: 'ready',
        eurostatData: action.payload.eurostat_data,
        indicatorName: action.payload.indicator_name,
        selectedCountryCodes: new Set(Object.keys(action.payload.eurostat_data)),
        selectedYearsByCountry: Object.fromEntries(
          Object.entries(action.payload.eurostat_data).map(([code, entry]) => [
            code,
            new Set(Object.keys(entry.values)),
          ]),
        ),
        eurostatError: null,
        ...invalidateSynthesis(),
      }
    case 'EUROSTAT_ERROR':
      return { ...state, eurostatStatus: 'error', eurostatError: action.error }
    case 'TOGGLE_COUNTRY': {
      const next = new Set(state.selectedCountryCodes)
      if (next.has(action.code)) { next.delete(action.code) } else { next.add(action.code) }
      return { ...state, selectedCountryCodes: next, ...invalidateSynthesis() }
    }
    case 'TOGGLE_YEAR': {
      const existing = state.selectedYearsByCountry[action.countryCode] ?? new Set<string>()
      const next = new Set(existing)
      if (next.has(action.year)) { next.delete(action.year) } else { next.add(action.year) }
      return {
        ...state,
        selectedYearsByCountry: { ...state.selectedYearsByCountry, [action.countryCode]: next },
        ...invalidateSynthesis(),
      }
    }
    case 'SYNTHESIS_LOADING':
      return { ...state, synthesisStatus: 'loading', synthesisError: null }
    case 'SYNTHESIS_SUCCESS':
      return {
        ...state,
        synthesisStatus: 'ready',
        synthesisText: action.payload.field6_text,
        wordCount: action.payload.word_count,
        synthesisError: null,
      }
    case 'SYNTHESIS_ERROR':
      return { ...state, synthesisStatus: 'error', synthesisError: action.error }
    case 'SET_SYNTHESIS_TEXT':
      return { ...state, synthesisText: action.text, wordCount: action.text.trim().split(/\s+/).filter(Boolean).length }
    case 'GO_TO_STEP':
      return { ...state, currentStep: action.step }
    case 'MARK_FLOW_COMPLETED':
      return { ...state, flowCompleted: true }
    case 'RESET_FIELD6_WORKFLOW':
      return { ...initialField6State }
    default:
      return state
  }
}
