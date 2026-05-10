import type { AnalyzeField30Response } from '../types'

export type StepStatus = 'idle' | 'loading' | 'ready' | 'error'

export interface Field30State {
  file: File | null
  analyzeStatus: StepStatus
  result: AnalyzeField30Response | null
  analyzeError: string | null
}

export type Field30Action =
  | { type: 'SET_FILE'; file: File }
  | { type: 'ANALYZE_LOADING' }
  | { type: 'ANALYZE_SUCCESS'; payload: AnalyzeField30Response }
  | { type: 'ANALYZE_ERROR'; error: string }
  | { type: 'RESET' }

export const initialField30State: Field30State = {
  file: null,
  analyzeStatus: 'idle',
  result: null,
  analyzeError: null,
}

export function field30Reducer(state: Field30State, action: Field30Action): Field30State {
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
      return initialField30State
    default:
      return state
  }
}
