import type { AnalyzeField4Response } from '../types'

export type StepStatus = 'idle' | 'loading' | 'ready' | 'error'

export interface Field4State {
  file: File | null
  analyzeStatus: StepStatus
  result: AnalyzeField4Response | null
  analyzeError: string | null
}

export type Field4Action =
  | { type: 'SET_FILE'; file: File }
  | { type: 'ANALYZE_LOADING' }
  | { type: 'ANALYZE_SUCCESS'; payload: AnalyzeField4Response }
  | { type: 'ANALYZE_ERROR'; error: string }
  | { type: 'RESET' }

export const initialField4State: Field4State = {
  file: null,
  analyzeStatus: 'idle',
  result: null,
  analyzeError: null,
}

export function field4Reducer(state: Field4State, action: Field4Action): Field4State {
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
      return initialField4State
    default:
      return state
  }
}
