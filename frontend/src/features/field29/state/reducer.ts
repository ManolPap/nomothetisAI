import type { AnalyzeField29Response } from '../types'

export type StepStatus = 'idle' | 'loading' | 'ready' | 'error'

export interface Field29State {
  file: File | null
  analyzeStatus: StepStatus
  result: AnalyzeField29Response | null
  analyzeError: string | null
}

export type Field29Action =
  | { type: 'SET_FILE'; file: File }
  | { type: 'ANALYZE_LOADING' }
  | { type: 'ANALYZE_SUCCESS'; payload: AnalyzeField29Response }
  | { type: 'ANALYZE_ERROR'; error: string }
  | { type: 'RESET' }

export const initialField29State: Field29State = {
  file: null,
  analyzeStatus: 'idle',
  result: null,
  analyzeError: null,
}

export function field29Reducer(state: Field29State, action: Field29Action): Field29State {
  switch (action.type) {
    case 'SET_FILE':
      return {
        ...state,
        file: action.file,
        analyzeStatus: 'idle',
        result: null,
        analyzeError: null,
      }
    case 'ANALYZE_LOADING':
      return { ...state, analyzeStatus: 'loading', analyzeError: null }
    case 'ANALYZE_SUCCESS':
      return {
        ...state,
        analyzeStatus: 'ready',
        result: action.payload,
        analyzeError: null,
      }
    case 'ANALYZE_ERROR':
      return { ...state, analyzeStatus: 'error', analyzeError: action.error }
    case 'RESET':
      return initialField29State
    default:
      return state
  }
}
