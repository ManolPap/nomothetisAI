import type { AnalyzeField4Response } from '../types'

export type StepStatus = 'idle' | 'loading' | 'ready' | 'error'

export interface PersistedFileMeta {
  name: string
  size: number
  lastModified: number
}

export interface Field4State {
  file: File | null
  fileMeta: PersistedFileMeta | null
  analyzeStatus: StepStatus
  result: AnalyzeField4Response | null
  analyzeError: string | null
  flowCompleted: boolean
}

export type Field4Action =
  | { type: 'SET_FILE'; file: File }
  | { type: 'ANALYZE_LOADING' }
  | { type: 'ANALYZE_SUCCESS'; payload: AnalyzeField4Response }
  | { type: 'ANALYZE_ERROR'; error: string }
  | { type: 'MARK_FLOW_COMPLETED' }
  | { type: 'RESET_FIELD4_WORKFLOW' }
  | { type: 'RESET' }

export const initialField4State: Field4State = {
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

export function field4Reducer(state: Field4State, action: Field4Action): Field4State {
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
        flowCompleted: true,
      }
    case 'ANALYZE_ERROR':
      return { ...state, analyzeStatus: 'error', analyzeError: action.error }
    case 'MARK_FLOW_COMPLETED':
      return { ...state, flowCompleted: true }
    case 'RESET_FIELD4_WORKFLOW':
    case 'RESET':
      return initialField4State
    default:
      return state
  }
}
