import type { AnalyzeField29Response } from '../types'

export type StepStatus = 'idle' | 'loading' | 'ready' | 'error'

export interface PersistedFileMeta {
  name: string
  size: number
  lastModified: number
}

export interface Field29State {
  file: File | null
  fileMeta: PersistedFileMeta | null
  analyzeStatus: StepStatus
  result: AnalyzeField29Response | null
  analyzeError: string | null
  flowCompleted: boolean
}

export type Field29Action =
  | { type: 'SET_FILE'; file: File }
  | { type: 'ANALYZE_LOADING' }
  | { type: 'ANALYZE_SUCCESS'; payload: AnalyzeField29Response }
  | { type: 'ANALYZE_ERROR'; error: string }
  | { type: 'RERUN_ANALYSIS' }
  | { type: 'MARK_FLOW_COMPLETED' }
  | { type: 'RESET_FIELD29_WORKFLOW' }
  | { type: 'RESET' }

export const initialField29State: Field29State = {
  file: null,
  fileMeta: null,
  analyzeStatus: 'idle',
  result: null,
  analyzeError: null,
  flowCompleted: false,
}

function fileToMeta(file: File): PersistedFileMeta {
  return {
    name: file.name,
    size: file.size,
    lastModified: file.lastModified,
  }
}

function isSameFileMeta(a: PersistedFileMeta | null, b: PersistedFileMeta): boolean {
  return Boolean(a && a.name === b.name && a.size === b.size && a.lastModified === b.lastModified)
}

export function field29Reducer(state: Field29State, action: Field29Action): Field29State {
  switch (action.type) {
    case 'SET_FILE': {
      const fileMeta = fileToMeta(action.file)
      if (isSameFileMeta(state.fileMeta, fileMeta)) {
        return {
          ...state,
          file: action.file,
          fileMeta,
        }
      }

      return {
        ...state,
        file: action.file,
        fileMeta,
        analyzeStatus: 'idle',
        result: null,
        analyzeError: null,
        flowCompleted: false,
      }
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
    case 'RERUN_ANALYSIS':
      return {
        ...state,
        analyzeStatus: 'idle',
        result: null,
        analyzeError: null,
        flowCompleted: false,
      }
    case 'MARK_FLOW_COMPLETED':
      return { ...state, flowCompleted: true }
    case 'RESET_FIELD29_WORKFLOW':
    case 'RESET':
      return initialField29State
    default:
      return state
  }
}
