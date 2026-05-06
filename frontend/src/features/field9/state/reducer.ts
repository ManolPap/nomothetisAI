import type {
  ExtractSectorResponse,
  FetchDataResponse,
  IndicatorData,
  IndicatorSuggestion,
  SuggestIndicatorsResponse,
} from '../types'

export type StepStatus = 'idle' | 'loading' | 'ready' | 'error'

export interface Field9State {
  currentStep: 1 | 2 | 3

  // Step 1
  file: File | null
  extractStatus: StepStatus
  sector: string
  year: number | null
  lawTitle: string
  extractError: string | null

  // Step 2
  suggestStatus: StepStatus
  suggestions: IndicatorSuggestion[]
  selectedDatasetIds: Set<string>
  suggestError: string | null

  // Step 3
  fetchStatus: StepStatus
  indicators: IndicatorData[]
  referenceYear: number | null
  fiveYearRange: number[]
  targetValues: Record<string, string>
  fetchError: string | null
}

export type Field9Action =
  | { type: 'SET_FILE'; file: File }
  | { type: 'EXTRACT_LOADING' }
  | { type: 'EXTRACT_SUCCESS'; payload: ExtractSectorResponse }
  | { type: 'EXTRACT_ERROR'; error: string }
  | { type: 'UPDATE_SECTOR'; sector: string }
  | { type: 'UPDATE_YEAR'; year: number }
  | { type: 'UPDATE_LAW_TITLE'; title: string }
  | { type: 'SUGGEST_LOADING' }
  | { type: 'SUGGEST_SUCCESS'; payload: SuggestIndicatorsResponse }
  | { type: 'SUGGEST_ERROR'; error: string }
  | { type: 'TOGGLE_INDICATOR'; datasetId: string }
  | { type: 'FETCH_LOADING' }
  | { type: 'FETCH_SUCCESS'; payload: FetchDataResponse }
  | { type: 'FETCH_ERROR'; error: string }
  | { type: 'SET_TARGET_VALUE'; datasetId: string; value: string }
  | { type: 'GO_TO_STEP'; step: 1 | 2 | 3 }

export const initialField9State: Field9State = {
  currentStep: 1,
  file: null,
  extractStatus: 'idle',
  sector: '',
  year: null,
  lawTitle: '',
  extractError: null,
  suggestStatus: 'idle',
  suggestions: [],
  selectedDatasetIds: new Set(),
  suggestError: null,
  fetchStatus: 'idle',
  indicators: [],
  referenceYear: null,
  fiveYearRange: [],
  targetValues: {},
  fetchError: null,
}

function invalidateSuggestAndFetch(): Partial<Field9State> {
  return {
    suggestStatus: 'idle', suggestions: [], selectedDatasetIds: new Set(), suggestError: null,
    fetchStatus: 'idle', indicators: [], referenceYear: null, fiveYearRange: [], fetchError: null,
  }
}

function invalidateFetch(): Partial<Field9State> {
  return {
    fetchStatus: 'idle', indicators: [], referenceYear: null, fiveYearRange: [], fetchError: null,
  }
}

export function field9Reducer(state: Field9State, action: Field9Action): Field9State {
  switch (action.type) {
    case 'SET_FILE':
      return {
        ...state, file: action.file, currentStep: 1,
        extractStatus: 'idle', sector: '', year: null, lawTitle: '', extractError: null,
        ...invalidateSuggestAndFetch(),
      }
    case 'EXTRACT_LOADING':
      return { ...state, extractStatus: 'loading', extractError: null }
    case 'EXTRACT_SUCCESS':
      return {
        ...state,
        extractStatus: 'ready',
        sector: action.payload.sector,
        year: action.payload.year,
        lawTitle: action.payload.law_title,
        extractError: null,
        ...invalidateSuggestAndFetch(),
      }
    case 'EXTRACT_ERROR':
      return { ...state, extractStatus: 'error', extractError: action.error }
    case 'UPDATE_SECTOR':
      return { ...state, sector: action.sector, ...invalidateSuggestAndFetch() }
    case 'UPDATE_YEAR':
      return { ...state, year: action.year, ...invalidateSuggestAndFetch() }
    case 'UPDATE_LAW_TITLE':
      return { ...state, lawTitle: action.title, ...invalidateSuggestAndFetch() }
    case 'SUGGEST_LOADING':
      return { ...state, suggestStatus: 'loading', suggestError: null }
    case 'SUGGEST_SUCCESS':
      return {
        ...state,
        suggestStatus: 'ready',
        suggestions: action.payload.suggestions,
        selectedDatasetIds: new Set(),
        suggestError: null,
        ...invalidateFetch(),
      }
    case 'SUGGEST_ERROR':
      return { ...state, suggestStatus: 'error', suggestError: action.error }
    case 'TOGGLE_INDICATOR': {
      const next = new Set(state.selectedDatasetIds)
      if (next.has(action.datasetId)) { next.delete(action.datasetId) } else { next.add(action.datasetId) }
      return { ...state, selectedDatasetIds: next, ...invalidateFetch() }
    }
    case 'FETCH_LOADING':
      return { ...state, fetchStatus: 'loading', fetchError: null }
    case 'FETCH_SUCCESS':
      return {
        ...state,
        fetchStatus: 'ready',
        indicators: action.payload.indicators,
        referenceYear: action.payload.reference_year,
        fiveYearRange: action.payload.five_year_range,
        fetchError: null,
      }
    case 'FETCH_ERROR':
      return { ...state, fetchStatus: 'error', fetchError: action.error }
    case 'SET_TARGET_VALUE':
      return { ...state, targetValues: { ...state.targetValues, [action.datasetId]: action.value } }
    case 'GO_TO_STEP':
      return { ...state, currentStep: action.step }
    default:
      return state
  }
}
